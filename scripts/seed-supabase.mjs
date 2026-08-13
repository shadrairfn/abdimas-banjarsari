import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { loadEnvFile } from "node:process";
import { createClient } from "@supabase/supabase-js";

const envFile = existsSync(".env.local") ? ".env.local" : existsSync(".env") ? ".env" : null;
if (envFile) loadEnvFile(envFile);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local or .env.");

const source = await fs.readFile(new URL("../src/data/umkm.ts", import.meta.url), "utf8");
const arrayText = source.match(/const rawUmkm: RawUmkm\[\] = \[([\s\S]*?)\n\];/)?.[1];
if (!arrayText) throw new Error("Unable to read the existing UMKM source rows.");
const rows = [...arrayText.matchAll(/\[(\d+),"([^"]*)","([^"]*)","([^"]*)","([^"]*)"\]/g)].map((match) => [Number(match[1]), match[2], match[3], match[4], match[5]]);
const outside = new Set([34, 38, 43]);
function hash(input) { let result = 2166136261; for (let i = 0; i < input.length; i += 1) { result ^= input.charCodeAt(i); result = Math.imul(result, 16777619); } return Math.abs(result); }
function classify(products) { const value = products.toUpperCase(); if (/ES |MINUMAN|JUS|SAKOTENG|SEKOTENG|CINCAU|SOP BUAH/.test(value)) return "Minuman"; if (/KUE|BOLU|ROTI|DONAT|MOCHI|LAPIS/.test(value)) return "Kue & Roti"; if (/NASI|LOTEK|GADO|KUPAT|URAP|SEMUR|OREK|PAIS|SEBLAK|CUANKI|BATAGOR|BASO TAHU/.test(value)) return "Makanan"; return "Camilan"; }
function coordinates([sourceNo, , address]) { const upper = address.toUpperCase(); let base = [-7.238, 107.8395]; if (upper.includes("CILOA")) base = [-7.2372, 107.8377]; if (upper.includes("CIBODAS")) base = [-7.2402, 107.8414]; if (upper.includes("SINDANG LAYA") || upper.includes("SINDANGLAYA")) base = [-7.2347, 107.8407]; if (upper.includes("PALNUNJUK")) base = [-7.2422, 107.8386]; if (sourceNo === 34) base = [-7.195, 107.895]; if (sourceNo === 38) base = [-7.175, 107.804]; if (sourceNo === 43) base = [-7.221, 107.875]; const seed = hash(`${sourceNo}-${address}`); return [base[0] + ((seed % 1000) / 1000 - .5) * .0018, base[1] + (((Math.floor(seed / 1000) % 1000) / 1000) - .5) * .0018]; }

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data: categories, error: categoryError } = await supabase.from("categories").select("id,name");
if (categoryError) throw categoryError;
const categoryIds = Object.fromEntries(categories.map((category) => [category.name, category.id]));
const records = rows.map((row) => { const [sourceNo, ownerName, address, name, products] = row; const [latitude, longitude] = coordinates(row); return { source_no: sourceNo, owner_name: ownerName, address, name, products, category_id: categoryIds[classify(products)], latitude, longitude, location_status: outside.has(sourceNo) ? "outside" : "estimated", is_active: true }; });
const { error } = await supabase.from("umkm").upsert(records, { onConflict: "source_no" });
if (error) throw error;
console.log(`Seeded ${records.length} UMKM records.`);
