import { Navbar } from "@/components/Navbar";
import { Lobby } from "@/components/Lobby";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden font-sans selection:bg-primary/20">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50 dark:opacity-20" />
      <div className="absolute bottom-0 right-0 w-[60vw] h-[600px] bg-sidebar-primary/10 blur-[100px] rounded-full pointer-events-none opacity-40 dark:opacity-10" />
      <div className="absolute top-1/2 left-0 w-[40vw] h-[400px] bg-secondary/30 blur-[150px] rounded-full pointer-events-none opacity-30 dark:opacity-10" />

      <Navbar />

      <div className="flex-1 flex flex-col pt-24 pb-12 container mx-auto px-4 relative z-10">
        <Lobby />
      </div>
    </main>
  );
}
