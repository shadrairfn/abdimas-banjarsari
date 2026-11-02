import { createClient } from "@supabase/supabase-js";
import { loadSupabaseEnv } from "./load-env.mjs";

// Fictional businesses for trying out the map. Their source numbers start at 9001, so the survey
// rows (1-68) and rows added by an admin are never touched. Run with --remove to delete them again.
const FIRST_DUMMY_SOURCE_NO = 9001;
const SPREAD_DEGREES = 0.0080;
const REMOVE_FLAG = "--remove";

const HAMLETS = {
  Ciloa: { center: [-7.2372, 107.8377], label: "KP. CILOA RT 01 RW 04" },
  Cibodas: { center: [-7.2402, 107.8414], label: "KP. CIBODAS RT 02 RW 02" },
  Sindanglaya: { center: [-7.2347, 107.8407], label: "KP. SINDANGLAYA RT 03 RW 08" },
  Palnunjuk: { center: [-7.2422, 107.8386], label: "KP. PALNUNJUK RT 01 RW 06" },
};

// [name, owner, hamlet, category, products, status, opening, closing, whatsapp, social]
const DUMMY_UMKM = [
  ["Keripik Singkong Bu Rina", "Rina Marlina", "Ciloa", "Camilan", "Keripik singkong balado, keripik pisang, kacang telur", "verified", "07:00", "20:00", "0812-5550-0101", "@keripik.burina"],
  ["Cireng Isi Mang Asep", "Asep Saepudin", "Ciloa", "Camilan", "Cireng isi ayam, cireng isi keju, cimol", "verified", "09:00", "21:00", "0812-5550-0102", "@cireng.mangasep"],
  ["Basreng Teh Lilis", "Lilis Suryani", "Cibodas", "Camilan", "Basreng pedas daun jeruk, siomay kering, kerupuk seblak", "estimated", "08:00", "17:00", "0812-5550-0103", null],
  ["Dodol Garut Sari Rasa", "Hj. Een Nurjanah", "Sindanglaya", "Camilan", "Dodol Garut, dodol peuyeum, wajit cililin", "verified", "08:00", "18:00", "0812-5550-0104", "@dodol.sarirasa"],
  ["Gurilem Neng Salsa", "Salsabila", "Palnunjuk", "Camilan", "Gurilem, kembang goyang, rengginang", "estimated", "08:00", "16:00", "0812-5550-0105", null],
  ["Seblak Ceu Imas", "Imas Masitoh", "Ciloa", "Makanan", "Seblak ceker, seblak kerupuk, batagor kuah", "verified", "10:00", "22:00", "0812-5550-0106", "@seblak.ceuimas"],
  ["Nasi Timbel Pak Dadang", "Dadang Hermawan", "Cibodas", "Makanan", "Nasi timbel komplit, ayam goreng, tahu tempe, lalapan", "verified", "06:00", "15:00", "0812-5550-0107", null],
  ["Lotek Bu Euis", "Euis Komariah", "Sindanglaya", "Makanan", "Lotek, gado-gado, karedok", "estimated", "07:00", "14:00", "0812-5550-0108", null],
  ["Bakso Aci Kang Ujang", "Ujang Sutisna", "Palnunjuk", "Makanan", "Baso aci, tahu bulat, cuanki", "verified", "13:00", "21:00", "0812-5550-0109", "@basoaci.kangujang"],
  ["Warung Nasi Uduk Mak Esih", "Esih Sukaesih", "Ciloa", "Makanan", "Nasi uduk, bihun goreng, bala-bala, telur balado", "estimated", "05:30", "10:00", "0812-5550-0110", null],
  ["Mie Ayam Garut Pak Eman", "Eman Sulaeman", "Cibodas", "Makanan", "Mie ayam, mie bakso, pangsit goreng", "verified", "10:00", "20:00", "0812-5550-0111", null],
  ["Sate Maranggi Kang Opik", "Taufik Hidayat", "Sindanglaya", "Makanan", "Sate maranggi, sate ayam, nasi liwet", "estimated", "16:00", "23:00", "0812-5550-0112", "@satemaranggi.opik"],
  ["Es Cendol Ceu Entin", "Entin Kartini", "Ciloa", "Minuman", "Es cendol, es dawet, es campur", "verified", "09:00", "17:00", "0812-5550-0113", null],
  ["Kopi Tarogong Kang Yayan", "Yayan Ruyani", "Cibodas", "Minuman", "Kopi tubruk, kopi susu aren, teh tarik", "verified", "08:00", "23:00", "0812-5550-0114", "@kopi.kangyayan"],
  ["Sekoteng Mang Uju", "Uju Junaedi", "Palnunjuk", "Minuman", "Sekoteng, bandrek, bajigur", "estimated", "17:00", "23:00", "0812-5550-0115", null],
  ["Es Kelapa Muda Pak Haji", "H. Ending", "Sindanglaya", "Minuman", "Es kelapa muda, es kelapa jeruk, kelapa bakar", "verified", "09:00", "18:00", "0812-5550-0116", null],
  ["Jus Buah Segar Teh Wiwin", "Wiwin Winarsih", "Ciloa", "Minuman", "Jus alpukat, jus strawberry, sop buah", "estimated", "10:00", "19:00", "0812-5550-0117", "@jus.tehwiwin"],
  ["Susu Segar Lembang Mekar", "Dede Mulyana", "Palnunjuk", "Minuman", "Susu sapi segar, susu jahe, yoghurt", "verified", "06:00", "12:00", "0812-5550-0118", null],
  ["Bolu Kukus Bu Heni", "Heni Rahayu", "Cibodas", "Kue & Roti", "Bolu kukus, bolu pandan, lapis legit", "verified", "07:00", "19:00", "0812-5550-0119", "@bolukukus.buheni"],
  ["Roti Bakar Kang Dede", "Dede Rohmat", "Sindanglaya", "Kue & Roti", "Roti bakar coklat keju, roti kukus, pisang bakar", "estimated", "16:00", "23:00", "0812-5550-0120", null],
  ["Kue Basah Ceu Titin", "Titin Kartini", "Ciloa", "Kue & Roti", "Kue cucur, kue lapis, nagasari, lemper", "verified", "05:00", "11:00", "0812-5550-0121", null],
  ["Donat Kentang Bu Yati", "Yati Mulyati", "Palnunjuk", "Kue & Roti", "Donat kentang, donat gula, bomboloni", "estimated", "06:00", "14:00", "0812-5550-0122", "@donat.buyati"],
  ["Brownies Kering Neng Dewi", "Dewi Lestari", "Cibodas", "Kue & Roti", "Brownies kering, kastengel, nastar, putri salju", "verified", "08:00", "17:00", "0812-5550-0123", "@brownies.nengdewi"],
  ["Toko Kue Buka 24 Jam Mang Cecep", "Cecep Supriatna", "Sindanglaya", "Kue & Roti", "Roti tawar, roti sobek, kue ulang tahun", "verified", "00:00", "00:00", "0812-5550-0124", null],
];

function hash(input) {
  let result = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    result ^= input.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }

  return Math.abs(result);
}

// A stable offset per business, so running the script again never moves a marker.
function coordinatesFor(name, hamlet) {
  const [baseLatitude, baseLongitude] = HAMLETS[hamlet].center;
  const seed = hash(name);
  const latitudeOffset = (seed % 1000) / 1000 - 0.5;
  const longitudeOffset = (Math.floor(seed / 1000) % 1000) / 1000 - 0.5;

  return [
    Number((baseLatitude + latitudeOffset * SPREAD_DEGREES).toFixed(6)),
    Number((baseLongitude + longitudeOffset * SPREAD_DEGREES).toFixed(6)),
  ];
}

const { url, serviceRoleKey } = loadSupabaseEnv();
const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

if (process.argv.includes(REMOVE_FLAG)) {
  const { error, count } = await supabase
    .from("umkm")
    .delete({ count: "exact" })
    .gte("source_no", FIRST_DUMMY_SOURCE_NO);

  if (error) {
    throw error;
  }

  console.log(`Removed ${count} dummy UMKM records.`);
  process.exit(0);
}

const { data: categories, error: categoryError } = await supabase.from("categories").select("id,name");

if (categoryError) {
  throw categoryError;
}

const categoryIds = Object.fromEntries(categories.map((category) => [category.name, category.id]));

const records = DUMMY_UMKM.map((row, index) => {
  const [name, ownerName, hamlet, category, products, status, openingHours, closingHours, contact, website] = row;
  const [latitude, longitude] = coordinatesFor(name, hamlet);

  return {
    source_no: FIRST_DUMMY_SOURCE_NO + index,
    owner_name: ownerName,
    name,
    products,
    address: `${HAMLETS[hamlet].label}, BANJARSARI, BAYONGBONG, GARUT`,
    category_id: categoryIds[category],
    latitude,
    longitude,
    location_status: status,
    contact,
    website,
    opening_hours: openingHours,
    closing_hours: closingHours,
    is_active: true,
  };
});

const missingCategory = records.find((record) => !record.category_id);

if (missingCategory) {
  throw new Error(`Category is missing in the database for "${missingCategory.name}". Run the migrations first.`);
}

const { error } = await supabase.from("umkm").upsert(records, { onConflict: "source_no" });

if (error) {
  throw error;
}

console.log(`Seeded ${records.length} dummy UMKM records (source_no ${FIRST_DUMMY_SOURCE_NO}+).`);
