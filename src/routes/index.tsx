import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Your App" },
      { name: "description", content: "Replace this with a one-sentence description of your app." },
      { property: "og:title", content: "Your App" },
      { property: "og:description", content: "Replace this with a one-sentence description of your app." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: "#fcfbf8" }}
    >
      <main className="max-w-lg p-8 text-center">
        <h1 className="text-3xl font-semibold text-slate-950">AcneTrex compatibility surface</h1>
        <p className="mt-3 text-slate-700">
          The native iOS and Android application is the primary AcneTrex product. This route is retained only for
          secondary web compatibility.
        </p>
      </main>
    </div>
  );
}
