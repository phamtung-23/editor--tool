// import Sample from "@/components/PDFViewer";
import dynamic from "next/dynamic";

// const Sample = dynamic(() => import("@/components/PDFViewer"), { ssr: false, });

const ImageEditor = dynamic(() => import("@/components/ImageEditor"), {
  ssr: false,
});
const PdfEditor = dynamic(() => import("@/components/PDFViewer"), {
  ssr: false,
});

export default function Page() {
  // return <Sample />;
  return (
    <>
      <ImageEditor imgUrl="" />
      <PdfEditor />
    </>
  );
}
