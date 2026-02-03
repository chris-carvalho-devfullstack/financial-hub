require('dotenv').config();
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

// ⚠️ Mude para true APENAS quando o log mostrar "✅ 3 usuários mapeados"
const WRITE_TO_DB = true; 

// --- VERIFICAÇÕES ---
if (!process.env.FIREBASE_CREDENTIALS || !process.env.SUPABASE_URL) {
  console.error("❌ ERRO: .env incompleto.");
  process.exit(1);
}

// --- INICIALIZAÇÃO ---
const serviceAccount = require(process.env.FIREBASE_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- HELPER: DATAS ---
// Converte qualquer formato de data (Firestore, String, JS Date) para ISO String (Postgres)
const toISO = (dateVal) => {
  if (!dateVal) return new Date().toISOString();
  if (dateVal.toDate) return dateVal.toDate().toISOString(); // Firestore Timestamp
  if (typeof dateVal === 'string') return dateVal; // Já é string
  return new Date(dateVal).toISOString();
};

async function migrate() {
  console.log(`\n🚀 INICIANDO MIGRAÇÃO | MODO ESCRITA: ${WRITE_TO_DB ? 'ATIVADO ⚠️' : 'DESATIVADO (Simulação)'}\n`);

  // ========================================================================
  // 1. MAPEAMENTO DE USUÁRIOS (Firebase UID -> Email -> Supabase UUID)
  // ========================================================================
  console.log("👥 [1/4] Mapeando Usuários...");
  
  const firebaseUserMap = {}; // UID -> Email
  // Lista usuários do Firebase (máximo 1000 por lote, ok para seu caso)
  const { users: fbUsers } = await admin.auth().listUsers();
  fbUsers.forEach(u => firebaseUserMap[u.uid] = u.email);

  const supabaseUserMap = {}; // Email -> UUID
  // Lista usuários do Supabase
  const { data: { users: sbUsers } } = await supabase.auth.admin.listUsers();
  sbUsers.forEach(u => supabaseUserMap[u.email] = u.id);

  // Mapa Final: Old_ID -> New_ID
  const userIdMap = {}; 
  let usersFound = 0;

  for (const [oldId, email] of Object.entries(firebaseUserMap)) {
    if (supabaseUserMap[email]) {
      userIdMap[oldId] = supabaseUserMap[email];
      usersFound++;
      // console.log(`   🔗 Encontrado: ${email}`); // Descomente se quiser ver os emails batendo
    } else {
      console.warn(`   ⚠️ Usuário do Firebase (${email}) AINDA NÃO EXISTE no Supabase.`);
    }
  }
  
  console.log(`   ✅ ${usersFound} usuários mapeados com sucesso.`);
  
  if (usersFound === 0) {
    console.error("\n❌ NENHUM USUÁRIO ENCONTRADO! Crie as contas no Supabase com os mesmos emails do Firebase antes de continuar.");
    return;
  }


  // ========================================================================
  // 2. MIGRAÇÃO DE VEÍCULOS
  // ========================================================================
  console.log("\n🚗 [2/4] Migrando Veículos...");
  const vehicleIdMap = {}; // Old_Vehicle_ID -> New_Vehicle_ID

  const vehiclesSnapshot = await db.collection('vehicles').get();
  
  for (const doc of vehiclesSnapshot.docs) {
    const data = doc.data();
    const oldId = doc.id;
    const newOwnerId = userIdMap[data.userId];

    if (!newOwnerId) continue; // Ignora se o dono não foi migrado

    const newVehicleData = {
      user_id: newOwnerId,
      name: data.name || 'Veículo sem nome',
      brand: data.brand || '',
      model: data.model || '',
      year: Number(data.year) || new Date().getFullYear(),
      license_plate: data.licensePlate || '',
      type: data.type || 'CAR',
      current_odometer: Number(data.currentOdometer) || 0,
      tanks: data.tanks || [], // JSONB array (Supabase aceita direto)
      created_at: toISO(data.createdAt),
      updated_at: toISO(data.updatedAt)
    };

    if (WRITE_TO_DB) {
      const { data: inserted, error } = await supabase
        .from('vehicles')
        .insert(newVehicleData)
        .select('id') // Retorna o novo ID gerado
        .single();

      if (error) {
        console.error(`   ❌ Erro ao inserir veículo ${data.name}:`, error.message);
      } else {
        vehicleIdMap[oldId] = inserted.id; // Guarda o mapeamento para usar nas transações!
        process.stdout.write("."); 
      }
    } else {
        // Simulação do ID
        vehicleIdMap[oldId] = `new_uuid_simulated_${oldId}`;
    }
  }
  console.log(`\n   ✅ Veículos processados.`);


  // ========================================================================
  // 3. MIGRAÇÃO DE TRANSAÇÕES
  // ========================================================================
  console.log("\nqb [3/4] Migrando Transações...");
  const transactionsSnapshot = await db.collection('transactions').get();
  let transCount = 0;
  const transactionsPayload = [];

  for (const doc of transactionsSnapshot.docs) {
    const data = doc.data();
    const newOwnerId = userIdMap[data.userId];
    const newVehicleId = vehicleIdMap[data.vehicleId];

    // Só migra se tiver dono E se o veículo vinculado também foi migrado
    if (!newOwnerId || !newVehicleId) continue;

    const newTransData = {
      user_id: newOwnerId,
      vehicle_id: newVehicleId,
      type: data.type || 'EXPENSE',
      category: data.category || 'OTHER',
      description: data.description || '',
      amount: Number(data.amount) || 0, // Cents
      date: toISO(data.date),
      
      // Combustível
      fuel_type: data.fuelType || null,
      liters: data.liters ? Number(data.liters) : null,
      price_per_liter: data.pricePerLiter ? Number(data.pricePerLiter) : null,
      is_full_tank: !!data.fullTank,
      station_name: data.stationName || null,
      
      // Geral
      odometer: data.odometer ? Number(data.odometer) : null,
      created_at: toISO(data.createdAt)
    };

    transactionsPayload.push(newTransData);
    transCount++;
  }

  if (WRITE_TO_DB && transactionsPayload.length > 0) {
      // Bulk Insert (Muito mais rápido)
      const { error } = await supabase.from('transactions').insert(transactionsPayload);
      if (error) console.error("   ❌ Erro no Bulk Insert de transações:", error.message);
      else console.log(`   ✅ ${transCount} transações inseridas.`);
  } else {
      console.log(`   ℹ️ ${transCount} transações prontas para inserção (Simulação).`);
  }


  // ========================================================================
  // 4. MIGRAÇÃO DE METAS (Goals)
  // ========================================================================
  console.log("\nQC [4/4] Migrando Metas...");
  const goalsSnapshot = await db.collection('goals').get();
  
  for (const doc of goalsSnapshot.docs) {
    const data = doc.data();
    const newOwnerId = userIdMap[data.userId];
    if (!newOwnerId) continue;

    // Traduz IDs dos veículos vinculados
    let newLinkedVehicles = [];
    if (data.linkedVehicleIds && Array.isArray(data.linkedVehicleIds)) {
        newLinkedVehicles = data.linkedVehicleIds
            .map(oldVId => vehicleIdMap[oldVId])
            .filter(id => id !== undefined);
    }

    const newGoalData = {
        user_id: newOwnerId,
        title: data.title,
        description: data.description || '',
        target_amount: Number(data.targetAmount) || 0,
        current_amount: Number(data.currentAmount) || 0,
        status: data.status || 'ACTIVE',
        deadline: data.deadline ? toISO(data.deadline) : null,
        linked_vehicle_ids: newLinkedVehicles,
        created_at: toISO(data.createdAt),
        updated_at: toISO(data.updatedAt)
    };

    if (WRITE_TO_DB) {
        const { error } = await supabase.from('goals').insert(newGoalData);
        if (error) console.error(`   ❌ Erro na meta ${data.title}:`, error.message);
        else process.stdout.write(".");
    }
  }
  
  console.log("\n\n🏁 Migração Finalizada!");
}

migrate();