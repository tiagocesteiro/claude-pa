import AuthHeader from "@/components/auth/AuthHeader";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthHeader />
      {children}
    </>
  );
}
