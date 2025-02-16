import dynamic from "next/dynamic";

// Import the canvas component dynamically to avoid SSR issues
const CanvasApp = dynamic(() => import("@/components/pdfTool/fabicDraw"), {
  ssr: false,
});

export default function Page() {
  // return <Sample />;
  return (
    <div className="mx-auto">
      <h1 className="text-2xl font-bold my-4">Drawing Canvas</h1>
      <CanvasApp />
    </div>
  );
}
