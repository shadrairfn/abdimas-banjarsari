"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { createCategoryAction } from "@/app/admin/category-actions";
import { useCategories } from "../category-provider";
import { usePersistentState } from "@/lib/ui/use-persistent-state";
import { Pagination } from "@/components/pagination";
import { CategoryIcon } from "@/features/umkm/categories";
import type { Umkm } from "@/features/umkm/types";

export function CategoriesPanel({ items }: { items: Umkm[] }) {
  const { categories, addCategory } = useCategories();
  const [name, setName] = useState(""); const [pending, setPending] = useState(false); const [message, setMessage] = useState("");
  const [page, setPage] = usePersistentState("admin:categories:page", 0);
  const [size, setSize] = usePersistentState("admin:categories:size", 10);
  const current = Math.min(page, Math.max(0, Math.ceil(categories.length / size) - 1));
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setMessage("");
    try { const result = await createCategoryAction(name); setMessage(result.message); if (result.success && result.data) { addCategory(result.data); setName(""); } }
    finally { setPending(false); }
  }
  return <><form className="category-create" onSubmit={submit}><label className="inp"><input aria-label="Nama kategori custom" placeholder="Nama kategori baru" value={name} minLength={2} maxLength={60} required onChange={event => setName(event.target.value)} /></label><button className="btn" disabled={pending}><Plus className="i" />{pending ? "Menambahkan…" : "Tambah kategori"}</button></form>{message && <p role="status">{message}</p>}
    <div className="card table-scroll"><table className="tbl"><thead><tr><th>Kategori</th><th>Jumlah UMKM</th></tr></thead><tbody>{categories.slice(current * size, (current + 1) * size).map(category => <tr key={category.id}><td><span className="category-name"><CategoryIcon category={category.name} />{category.name}</span></td><td>{items.filter(item => item.subCategory === category.name).length}</td></tr>)}</tbody></table></div>
    <Pagination page={current} pageSize={size} total={categories.length} onPageChange={setPage} onPageSizeChange={value => { setSize(value); setPage(0); }} /></>;
}
