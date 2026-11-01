import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { loadSupabaseEnv } from "./load-env.mjs";

const { url, serviceRoleKey } = loadSupabaseEnv();

// Source numbers of businesses that are known to be outside the village area.
const OUTSIDE_SOURCE_NUMBERS = new Set([34, 38, 43]);
const DEFAULT_CENTER = [-7.238, 107.8395];
const OUTSIDE_CENTERS = {
  34: [-7.195, 107.895],
  38: [-7.175, 107.804],
  43: [-7.221, 107.875],
};
// Coordinates are estimated near the hamlet named in the address, then verified by an admin.
const HAMLET_CENTERS = [
  { keywords: ["CILOA"], center: [-7.2372, 107.8377] },
  { keywords: ["CIBODAS"], center: [-7.2402, 107.8414] },
  { keywords: ["SINDANG LAYA", "SINDANGLAYA"], center: [-7.2347, 107.8407] },
  { keywords: ["PALNUNJUK"], center: [-7.2422, 107.8386] },
];
const SPREAD_DEGREES = 0.0018;

const CATEGORY_RULES = [
  { category: "Minuman", pattern: /ES |MINUMAN|JUS|SAKOTENG|SEKOTENG|CINCAU|SOP BUAH/ },
  { category: "Kue & Roti", pattern: /KUE|BOLU|ROTI|DONAT|MOCHI|LAPIS/ },
  { category: "Makanan", pattern: /NASI|LOTEK|GADO|KUPAT|URAP|SEMUR|OREK|PAIS|SEBLAK|CUANKI|BATAGOR|BASO TAHU/ },
];
const DEFAULT_CATEGORY = "Camilan";

function hash(input) {
  let result = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    result ^= input.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }

  return Math.abs(result);
}

function classify(products) {
  const upperProducts = products.toUpperCase();
  const matchedRule = CATEGORY_RULES.find((rule) => rule.pattern.test(upperProducts));

  return matchedRule ? matchedRule.category : DEFAULT_CATEGORY;
}

function findBaseCoordinates(sourceNo, address) {
  if (OUTSIDE_CENTERS[sourceNo]) {
    return OUTSIDE_CENTERS[sourceNo];
  }

  const upperAddress = address.toUpperCase();
  // The last matching hamlet wins, the same as the original seed.
  const hamlet = HAMLET_CENTERS.findLast((item) => item.keywords.some((keyword) => upperAddress.includes(keyword)));

  return hamlet ? hamlet.center : DEFAULT_CENTER;
}

// A stable offset per business, so re-running the seed never moves a marker.
function estimateCoordinates(sourceNo, address) {
  const [baseLatitude, baseLongitude] = findBaseCoordinates(sourceNo, address);
  const seed = hash(`${sourceNo}-${address}`);
  const latitudeOffset = (seed % 1000) / 1000 - 0.5;
  const longitudeOffset = (Math.floor(seed / 1000) % 1000) / 1000 - 0.5;

  return [
    baseLatitude + latitudeOffset * SPREAD_DEGREES,
    baseLongitude + longitudeOffset * SPREAD_DEGREES,
  ];
}

async function readSourceRows() {
  const source = await fs.readFile(new URL("../src/data/umkm.ts", import.meta.url), "utf8");
  const arrayText = source.match(/const rawUmkm: RawUmkm\[\] = \[([\s\S]*?)\n\];/)?.[1];

  if (!arrayText) {
    throw new Error("Unable to read the existing UMKM source rows.");
  }

  const rowPattern = /\[(\d+),"([^"]*)","([^"]*)","([^"]*)","([^"]*)"\]/g;

  return [...arrayText.matchAll(rowPattern)].map((match) => ({
    sourceNo: Number(match[1]),
    ownerName: match[2],
    address: match[3],
    name: match[4],
    products: match[5],
  }));
}

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

const { data: categories, error: categoryError } = await supabase.from("categories").select("id,name");

if (categoryError) {
  throw categoryError;
}

const categoryIds = Object.fromEntries(categories.map((category) => [category.name, category.id]));
const rows = await readSourceRows();

const records = rows.map((row) => {
  const [latitude, longitude] = estimateCoordinates(row.sourceNo, row.address);

  return {
    source_no: row.sourceNo,
    owner_name: row.ownerName,
    address: row.address,
    name: row.name,
    products: row.products,
    category_id: categoryIds[classify(row.products)],
    latitude,
    longitude,
    location_status: OUTSIDE_SOURCE_NUMBERS.has(row.sourceNo) ? "outside" : "estimated",
    is_active: true,
  };
});

const { error } = await supabase.from("umkm").upsert(records, { onConflict: "source_no" });

if (error) {
  throw error;
}

console.log(`Seeded ${records.length} UMKM records.`);
