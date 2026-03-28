import Sidebar from "@/components/layout/Sidebar";
import MainWorkspace from "@/components/layout/MainWorkspace";

export default function Home() {
  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar />
      <main className="flex flex-col flex-1 min-w-0 min-h-0">
        <MainWorkspace />
      </main>
    </div>
  );
}
