// import PDFViewer from "@/components/PdfTool-react-pdf-viewer";

import dynamic from 'next/dynamic';

// import PDFViewer from "@/components/PdfTool_apryse_pdftron";
const PdfAnnotator = dynamic(() => import('@/components/pdfTool/PdfAnnotator'), { ssr: false });



export default function Page() {
  // return <Sample />;
  return (
    <>
      {/* <PDFViewer pdfUrl="https://pdftron.s3.amazonaws.com/downloads/pl/demo-annotated.pdf" /> */}
      {/* <PDFViewer /> */}
      <div className="w-full mx-auto p-4">
        <h1 className="text-2xl font-bold">PDF Annotator</h1>
        <PdfAnnotator pdfUrl="/sample.pdf" />
      </div>
    </>
  );
}
