"use client";

import { useEffect, useRef, useState } from "react";
import { AnnotationFactory } from "annotpdf";
import * as pdfjsLib from "pdfjs-dist";

import dynamic from "next/dynamic";
import PdfToolbar from "./toolbars/PdfToolbar";
import { AnnotationType } from "@/types/annotations";
import BookmarkSidebar from "./toolbars/bookmark";
import AnnotationSidebar from "./toolbars/annotationList";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfAnnotatorProps {
  pdfUrl: string;
}

interface Bookmark {
  title: string;
  pageRef: number;
}

const PdfAnnotator = ({ pdfUrl }: PdfAnnotatorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfFactory, setPdfFactory] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [selectedTool, setSelectedTool] = useState<AnnotationType | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [scale] = useState(1);

  useEffect(() => {
    loadPdf();
  }, [pdfUrl]);

  useEffect(() => {
    if (numPages > 0) {
      renderPage(currentPage);
    }
  }, [currentPage, numPages]); // Thêm annotations vào dependencies

  const loadPdf = async () => {
    try {
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdfDocument = await loadingTask.promise;

      // Initialize annotation factory
      const pdfData = await pdfDocument.getData();
      const factory = new AnnotationFactory(pdfData);

      setPdfFactory(factory);
      setNumPages(pdfDocument.numPages);

      // Render first page
      renderPage(0);
    } catch (error) {
      console.error("Error loading PDF:", error);
    }
  };

  const renderPage = async (pageNumber: number) => {
    if (!canvasRef.current) return;

    try {
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdfDocument = await loadingTask.promise;
      const page = await pdfDocument.getPage(pageNumber);

      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;

      if (canvas) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const context = canvas.getContext("2d");
        if (context) {
          // Render PDF page
          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          // Render existing annotations
        }
      }
    } catch (error) {
      console.error("Error rendering page:", error);
    }
  };

  const handleAddAnnotation = async () => {
    if (!pdfFactory) return;

    try {
      // Example: Add a text annotation
      // pdfFactory.createSquareAnnotation({
      //   page: 0, // PDF pages are 0-based
      //   rect: [18 / 1.5, ((1263 - 12.599990844726562) / 1.5), 515 / 1.5, ((1263 - 298.59999084472656) / 1.5)],
      //   contents: "Sample annotation",
      //   author: "User",
      //   color: { r: 255, g: 0, b: 0 },
      // });
      const canvas = canvasRef.current;
      if (!canvas) return;
      // console.log("Canvas:", canvas);
      const height = canvas.getBoundingClientRect().height;

      pdfFactory.createSquareAnnotation({
        page: 0, // PDF pages are 0-based
        rect: [
          71.30000305175781,
          height - 150.59999084472656,
          526.3000030517578,
          height - 424.59999084472656,
        ],
        contents: "Sample annotation",
        author: "User",
        color: { r: 255, g: 0, b: 0 },
      });
      // Example: Add a text annotation
      pdfFactory.createTextAnnotation({
        page: 0, // PDF pages are 0-based
        rect: [
          99 / 1.5,
          (1263 - 150.59999990463257) / 1.5,
          99 / 1.5,
          (1263 - 150.59999990463257) / 1.5,
        ],
        contents: "Sample annotation",
        author: "User",
        color: { r: 255, g: 0, b: 0 },
      });

      // Download the annotated PDF
      pdfFactory.download("annotated.pdf");
    } catch (error) {
      console.error("Error adding annotation:", error);
    }
  };

  //=========== Handle page navigation ===========//
  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages));
  };

  //=========== Handle bookmarking ===========//
  const handleJumpToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleAddBookmark = () => {
    // check if the page is already bookmarked
    const isBookmarked = bookmarks.some(
      (bookmark) => bookmark.pageRef === currentPage
    );
    if (isBookmarked) return;

    const newBookmark = {
      title: `Bookmark ${bookmarks.length + 1}`,
      pageRef: currentPage,
    };
    setBookmarks((prevBookmarks) => [...prevBookmarks, newBookmark]);
  };


  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className="w-full flex gap-4 items-center">
        <div className="w-full grid grid-cols-12 gap-4">
          <div className="col-span-12">
            <PdfToolbar
              selectedTool={selectedTool}
              onSelectTool={setSelectedTool}
              onDownload={handleAddAnnotation}
              onClearAnno={() => console.log("Clear annotation")}
              currentPage={currentPage}
              numPages={numPages}
              onPreviousPage={handlePreviousPage}
              onNextPage={handleNextPage}
            />
          </div>
          <div className="col-span-12 flex justify-between">
            <div className="md:w-1/4 pr-1">
              <BookmarkSidebar
                bookmarks={bookmarks}
                onJumpToPage={handleJumpToPage}
                onAddBookmark={handleAddBookmark}
              />
            </div>
            <div className="flex justify-center">
              <div className="relative max-w-max border border-gray-300 rounded-lg shadow-lg flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  className="max-w-max rounded-lg"
                  style={{ cursor: selectedTool ? "crosshair" : "default" }}
                />
              </div>
            </div>
            <div className="md:w-1/4 pl-1">
              <AnnotationSidebar />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfAnnotator;
