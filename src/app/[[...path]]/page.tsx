import Site from "@/components/site";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  return (
    <Site
      path={path}
      demo={!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      localWrite={
        process.env.NODE_ENV === "development" && !process.env.WORKER_API_URL
      }
    />
  );
}
