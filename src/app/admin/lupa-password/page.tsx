import { PasswordForm } from "@/features/admin/components/password-form";
import { PasswordPage } from "@/features/admin/components/password-page";

export const metadata = { title: "Lupa kata sandi" };
export default function ForgotPasswordPage() {
  return (
    <PasswordPage
      title="Lupa kata sandi?"
      description="Masukkan email akun Admin atau Superadmin untuk menerima tautan pemulihan."
    >
      <PasswordForm />
      <p className="mut">
        Untuk akun khusus Google, gunakan tombol Masuk dengan Google. Kunci akses pemilik dapat
        diminta kembali kepada admin desa.
      </p>
    </PasswordPage>
  );
}
