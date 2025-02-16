"use client";

import { useCallback, useRef, useState } from "react";
import { useResizeObserver } from "@wojtekmaj/react-hooks";
import { pdfjs, Document, Page } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

import "./styles.css";

import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import ImageEditor from "./ImageEditor";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const options = {
  cMapUrl: "/cmaps/",
  standardFontDataUrl: "/standard_fonts/",
};

const resizeObserverOptions = {};

const maxWidth = 800;

type PDFFile = string | File | null;

interface StylesType {
  [key: string]: React.CSSProperties;
}

const styles: StylesType = {
  container: {
    maxWidth: "100%",
    margin: "0 auto",
    padding: "20px",
  },
  controls: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "20px",
  },
  button: {
    padding: "8px 16px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  disabledButton: {
    backgroundColor: "#cccccc",
    cursor: "not-allowed",
  },
};

export default function Sample() {
  const [file, setFile] = useState<PDFFile>("./sample.pdf");
  const [numPages, setNumPages] = useState<number>();
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  const onResize = useCallback<ResizeObserverCallback>((entries) => {
    const [entry] = entries;

    if (entry) {
      setContainerWidth(entry.contentRect.width);
    }
  }, []);

  useResizeObserver(containerRef, resizeObserverOptions, onResize);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { files } = event.target;

    const nextFile = files?.[0];

    if (nextFile) {
      setFile(nextFile);
    }
  }

  function onDocumentLoadSuccess({ numPages }: PDFDocumentProxy): void {
    setNumPages(numPages);
  }

  async function handleConvertToImage() {
    const pdf = await pdfjs.getDocument(file as any).promise;
    const page = await pdf.getPage(pageNumber);

    // Calculate a scale for HD resolution
    const desiredWidth = 1920; // Desired width for HD
    const viewport = page.getViewport({ scale: 1 }); // Initial scale to get dimensions
    const scale = desiredWidth / viewport.width; // Calculate scale for desired width

    const hdViewport = page.getViewport({ scale }); // Apply calculated scale
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = hdViewport.width;
    canvas.height = hdViewport.height;

    const context = canvas.getContext("2d");
    if (!context) return;

    await page.render({
      canvasContext: context,
      viewport: hdViewport,
    }).promise;

    // Convert canvas to data URL
    const dataUrl = canvas.toDataURL("image/png");

    setImgUrl(dataUrl);

    // // Download the image
    // const link = document.createElement("a");
    // link.href = dataUrl;
    // link.download = `page-${pageNumber}.png`;
    // link.click();
  }

  return (
    <>
      <div className="Example">
        <div className="Example__container">
          <div className="Example__container__load">
            <label htmlFor="file">Load from file:</label>{" "}
            <input onChange={onFileChange} type="file" />
          </div>
          {imgUrl && (
            <div style={{ width: "100%", height: "100%" }}>
              <ImageEditor imgUrl={imgUrl} />
            </div>
          )}
          <div className="Example__container__document" ref={setContainerRef}>
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              options={options}
            >
              <Page pageNumber={pageNumber} />
            </Document>
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>
        </div>
      </div>
      <div style={styles.controls}>
        <p>
          Page {pageNumber} of {numPages}
        </p>
        <button
          style={{
            ...styles.button,
            ...(pageNumber <= 1 ? styles.disabledButton : {}),
          }}
          disabled={pageNumber <= 1}
          onClick={() => setPageNumber(pageNumber - 1)}
        >
          Previous
        </button>
        <button
          style={{
            ...styles.button,
            ...(pageNumber >= (numPages || 0) ? styles.disabledButton : {}),
          }}
          disabled={pageNumber >= (numPages || 0)}
          onClick={() => setPageNumber(pageNumber + 1)}
        >
          Next
        </button>
        <button style={styles.button} onClick={handleConvertToImage}>
          Convert to Image
        </button>
      </div>
    </>
  );
}
