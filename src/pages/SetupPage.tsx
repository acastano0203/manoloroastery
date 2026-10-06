/** Se muestra cuando faltan las llaves de Supabase en .env.local. */
export function SetupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-[560px] flex-col gap-4 rounded-[14px] border border-arena bg-white p-6">
        <h1 className="m-0 text-2xl font-bold">Falta conectar Supabase</h1>
        <ol className="m-0 flex flex-col gap-2 pl-5 text-[15px]">
          <li>Crea un proyecto en supabase.com.</li>
          <li>
            Copia la URL y la anon key (Project Settings › API) en <code>.env.local</code>:
            <pre className="mt-2 overflow-x-auto rounded-lg bg-crema-claro p-3 text-sm">VITE_SUPABASE_URL=...{'\n'}VITE_SUPABASE_ANON_KEY=...</pre>
          </li>
          <li>Corre la migración de <code>supabase/migrations</code> y reinicia <code>npm run dev</code>.</li>
        </ol>
      </div>
    </main>
  )
}
