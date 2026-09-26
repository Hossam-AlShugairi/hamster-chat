import LoginForm from '@/components/LoginForm';

export default function LoginPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-4 bg-stone-950 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 hamster-bg opacity-[0.04]" />
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/60 to-stone-950" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-stone-900/80 backdrop-blur-xl border border-stone-800/80 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
          {/* Header & Logo */}
          <div className="w-16 h-16 rounded-2xl bg-amber-900/40 border border-amber-600/30 flex items-center justify-center text-3xl mb-4 shadow-inner">
            🐹
          </div>
          <h1 className="text-2xl font-bold text-stone-100 tracking-tight mb-1">
            Hamster Chat
          </h1>
          <p className="text-stone-400 text-sm mb-8 text-center">
            Private & Encrypted Mystery Messaging
          </p>

          <LoginForm />
        </div>
      </div>
    </main>
  );
}
