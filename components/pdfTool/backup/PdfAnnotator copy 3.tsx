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

interface Annotation {
  type: AnnotationType;
  rect: number[];
  color: { r: number; g: number; b: number };
  contents?: string;
  vertices?: number[];
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
  const [scale] = useState(1);

  // const [pdfjsLibVar, setPdfjsLibVar] = useState<any>(null);
  const [selectedTool, setSelectedTool] = useState<AnnotationType | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPointCanvas, setStartPointCanvas] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [startPointPDF, setStartPointPDF] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const tempCanvasRef = useRef<HTMLCanvasElement>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    loadPdf();
  }, [pdfUrl]);

  useEffect(() => {
    if (numPages > 0) {
      renderPage(currentPage);
    }
  }, [currentPage, numPages, annotations]); // Thêm annotations vào dependencies

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
      const tempCanvas = tempCanvasRef.current;

      if (canvas && tempCanvas) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        tempCanvas.width = viewport.width;

        const context = canvas.getContext("2d");
        if (context) {
          // Render PDF page
          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          // Render existing annotations
          renderAnnotations(context);
        }
      }
    } catch (error) {
      console.error("Error rendering page:", error);
    }
  };

  const renderAnnotations = (context: CanvasRenderingContext2D) => {
    // console.log("Rendering annotations:", annotations); // Debug log
    annotations.forEach((annotation) => {
      switch (annotation.type) {
        case AnnotationType.TEXT:
          drawTextAnnotation(context, annotation.rect, annotation.color);
          break;
        case AnnotationType.HIGHLIGHT:
          drawHighlightAnnotation(context, annotation.rect, annotation.color);
          break;
        case AnnotationType.UNDERLINE:
          drawUnderlineAnnotation(context, annotation.rect, annotation.color);
          break;
        case AnnotationType.SQUARE:
          drawSquareAnnotation(context, annotation.rect, annotation.color);
          break;
        case AnnotationType.CIRCLE:
          drawCircleAnnotation(context, annotation.rect, annotation.color);
          break;
        case AnnotationType.FREETEXT:
          drawFreeTextAnnotation(
            context,
            annotation.rect,
            annotation.color,
            annotation.contents || ""
          );
          break;
        case AnnotationType.STRIKEOUT:
          drawStrikeOutAnnotation(context, annotation.rect, annotation.color);
          break;
        case AnnotationType.POLYGON:
          if (annotation.vertices) {
            drawPolygonAnnotation(
              context,
              annotation.vertices,
              annotation.color
            );
          }
          break;
      }
    });
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

  const getMousePosition = (event: MouseEvent): { x: number; y: number } => {
    // console.log("Mouse position");
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    // console.log(event.clientX - rect.left, event.clientY - rect.top);
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handleCanvasMouseDown = (event: MouseEvent) => {
    if (!selectedTool || !canvasRef.current) return;
    // console.log("Mouse down:", event.clientX, event.clientY);
    setIsDrawing(true);
    const pos = getMousePosition(event);
    setStartPointCanvas(pos);
    setStartPointPDF({
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleCanvasMouseUp = async (event: MouseEvent) => {
    if (
      !isDrawing ||
      !startPointCanvas ||
      !startPointPDF ||
      !selectedTool ||
      !pdfFactory
    )
      return;

    const endPointCanvas = getMousePosition(event);
    const endPointPDF = {
      x: event.clientX,
      y: event.clientY,
    };
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const height = canvas.getBoundingClientRect().height;

    // Clear preview
    const tempContext = tempCanvasRef.current?.getContext("2d");
    if (tempContext) {
      tempContext.clearRect(
        0,
        0,
        tempCanvasRef.current!.width,
        tempCanvasRef.current!.height
      );
    }

    const rectCanvas = [
      Math.min(startPointCanvas.x, endPointCanvas.x),
      Math.min(startPointCanvas.y, endPointCanvas.y),
      Math.max(startPointCanvas.x, endPointCanvas.x),
      Math.max(startPointCanvas.y, endPointCanvas.y),
    ];
    // console.log("position draw on canvas:", rectCanvas);

    const rect = [
      Math.min(startPointCanvas.x, endPointCanvas.x),
      Math.min(height - startPointCanvas.y, height - endPointCanvas.y),
      Math.max(startPointCanvas.x, endPointCanvas.x),
      Math.max(height - startPointCanvas.y, height - endPointCanvas.y),
    ];
    // console.log("position draw on PDF:", rect);

    try {
      let newAnnotation: Annotation | null = null;

      switch (selectedTool) {
        case AnnotationType.TEXT:
          newAnnotation = {
            type: AnnotationType.TEXT,
            rect: rect,
            color: { r: 255, g: 0, b: 0 },
          };
          break;

        case AnnotationType.HIGHLIGHT:
          newAnnotation = {
            type: AnnotationType.HIGHLIGHT,
            rect: rect,
            color: { r: 255, g: 255, b: 0 },
          };
          break;

        case AnnotationType.UNDERLINE:
          newAnnotation = {
            type: AnnotationType.UNDERLINE,
            rect: rect,
            color: { r: 0, g: 0, b: 255 },
          };
          break;

        case AnnotationType.SQUARE:
          newAnnotation = {
            type: AnnotationType.SQUARE,
            rect: rect,
            color: { r: 0, g: 255, b: 0 },
          };
          break;

        case AnnotationType.CIRCLE:
          newAnnotation = {
            type: AnnotationType.CIRCLE,
            rect: rect,
            color: { r: 255, g: 0, b: 255 },
          };
          break;

        case AnnotationType.FREETEXT:
          const text = prompt("Enter text:", "");
          if (text) {
            newAnnotation = {
              type: AnnotationType.FREETEXT,
              rect: rect,
              color: { r: 0, g: 0, b: 0 },
              contents: text,
            };
          }
          break;

        case AnnotationType.STRIKEOUT:
          newAnnotation = {
            type: AnnotationType.STRIKEOUT,
            rect: rect,
            color: { r: 255, g: 0, b: 0 },
          };
          break;

        case AnnotationType.POLYGON:
          newAnnotation = {
            type: AnnotationType.POLYGON,
            rect: rect,
            vertices: [
              rect[0],
              rect[1],
              rect[2],
              rect[1],
              rect[2],
              rect[3],
              rect[0],
              rect[3],
            ],
            color: { r: 128, g: 0, b: 128 },
          };
          break;
      }

      if (newAnnotation) {
        // Add to PDF
        const pdfRect = rect.map((coord) => coord / scale);
        switch (newAnnotation.type) {
          case AnnotationType.TEXT:
            pdfFactory.createTextAnnotation({
              page: currentPage - 1,
              rect: pdfRect,
              contents: "Text annotation",
              author: "User",
              color: newAnnotation.color,
            });
            break;
          case AnnotationType.HIGHLIGHT:
            pdfFactory.createHighlightAnnotation({
              page: currentPage - 1,
              rect: pdfRect,
              contents: "Highlight annotation",
              author: "User",
              color: newAnnotation.color,
            });
            break;
          case AnnotationType.UNDERLINE:
            pdfFactory.createUnderlineAnnotation({
              page: currentPage - 1,
              rect: pdfRect,
              contents: "Underline annotation",
              author: "User",
              color: newAnnotation.color,
            });
            break;
          case AnnotationType.SQUARE:
            pdfFactory.createSquareAnnotation({
              page: currentPage - 1,
              rect: pdfRect,
              contents: "Square annotation",
              author: "User",
              color: newAnnotation.color,
            });
            break;

          case AnnotationType.CIRCLE:
            pdfFactory.createCircleAnnotation({
              page: currentPage - 1,
              rect: pdfRect,
              contents: "Circle annotation",
              author: "User",
              color: newAnnotation.color,
            });
            break;

          case AnnotationType.FREETEXT:
            const text = prompt("Enter text:", "");
            if (text) {
              pdfFactory.createFreeTextAnnotation({
                page: currentPage - 1,
                rect: pdfRect,
                contents: text,
                author: "User",
                color: newAnnotation.color,
              });
            }
            break;

          case AnnotationType.STRIKEOUT:
            pdfFactory.createStrikeOutAnnotation({
              page: currentPage - 1,
              rect: pdfRect,
              contents: "Strike out annotation",
              author: "User",
              color: newAnnotation.color,
            });
            break;

          case AnnotationType.POLYGON:
            pdfFactory.createPolygonAnnotation({
              page: currentPage - 1,
              rect: pdfRect,
              vertices: [
                pdfRect[0],
                pdfRect[1],
                pdfRect[2],
                pdfRect[1],
                pdfRect[2],
                pdfRect[3],
                pdfRect[0],
                pdfRect[3],
              ],
              contents: "Polygon annotation",
              author: "User",
              color: newAnnotation.color,
            });
            break;

          // Add other cases similarly...
        }

        // Add to state
        const annotationCanvas = {
          ...newAnnotation,
          rect: rectCanvas,
        };
        setAnnotations((prev) => [...prev, annotationCanvas]);
      }
    } catch (error) {
      console.error("Error creating annotation:", error);
    }
  };

  const handleCanvasMouseMove = (event: MouseEvent) => {
    if (!isDrawing || !startPointCanvas || !selectedTool) return;

    // console.log("Mouse move:", event.clientX, event.clientY);
    const currentPoint = getMousePosition(event);
    const tempContext = tempCanvasRef.current?.getContext("2d");

    if (tempContext) {
      // Clear previous preview
      tempContext.clearRect(
        0,
        0,
        tempCanvasRef.current!.width,
        tempCanvasRef.current!.height
      );

      // console.log("Mouse move:", currentPoint.x, currentPoint.y);

      const previewRect = [
        startPointCanvas.x,
        startPointCanvas.y,
        currentPoint.x,
        currentPoint.y,
      ];

      switch (selectedTool) {
        case AnnotationType.TEXT:
          drawTextAnnotation(tempContext, previewRect, { r: 255, g: 0, b: 0 });
          break;
        case AnnotationType.HIGHLIGHT:
          drawHighlightAnnotation(tempContext, previewRect, {
            r: 255,
            g: 255,
            b: 0,
          });
          break;
        case AnnotationType.UNDERLINE:
          drawUnderlineAnnotation(tempContext, previewRect, {
            r: 0,
            g: 0,
            b: 255,
          });
          break;
        case AnnotationType.SQUARE:
          drawSquareAnnotation(tempContext, previewRect, {
            r: 0,
            g: 255,
            b: 0,
          });
          break;
        case AnnotationType.CIRCLE:
          drawCircleAnnotation(tempContext, previewRect, {
            r: 255,
            g: 0,
            b: 255,
          });
          break;
        case AnnotationType.FREETEXT:
          drawFreeTextAnnotation(
            tempContext,
            previewRect,
            { r: 0, g: 0, b: 0 },
            "Sample text"
          );
          break;
        case AnnotationType.STRIKEOUT:
          drawStrikeOutAnnotation(tempContext, previewRect, {
            r: 255,
            g: 0,
            b: 0,
          });
          break;
        case AnnotationType.POLYGON:
          drawPolygonAnnotation(
            tempContext,
            [
              startPointCanvas.x,
              startPointCanvas.y,
              currentPoint.x,
              currentPoint.y,
            ],
            { r: 128, g: 0, b: 128 }
          );
          break;
      }
    }
  };

  const drawTextAnnotation = (
    context: CanvasRenderingContext2D,
    rect: number[],
    color: { r: number; g: number; b: number }
  ) => {
    // render dot
    context.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    context.beginPath();
    context.arc(rect[0], rect[1], 2, 0, 2 * Math.PI);
    context.fill();

    context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`;
    context.fillRect(rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]);
  };

  const drawHighlightAnnotation = (
    context: CanvasRenderingContext2D,
    rect: number[],
    color: { r: number; g: number; b: number }
  ) => {
    context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`;
    context.fillRect(rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]);
  };

  const drawUnderlineAnnotation = (
    context: CanvasRenderingContext2D,
    rect: number[],
    color: { r: number; g: number; b: number }
  ) => {
    context.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(rect[0], rect[3]);
    context.lineTo(rect[2], rect[3]);
    context.stroke();
  };

  const drawSquareAnnotation = (
    context: CanvasRenderingContext2D,
    rect: number[],
    color: { r: number; g: number; b: number }
  ) => {
    context.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    context.lineWidth = 2;
    context.strokeRect(rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]);
  };

  const drawCircleAnnotation = (
    context: CanvasRenderingContext2D,
    rect: number[],
    color: { r: number; g: number; b: number }
  ) => {
    const centerX = (rect[0] + rect[2]) / 2;
    const centerY = (rect[1] + rect[3]) / 2;
    const radiusX = Math.abs(rect[2] - rect[0]) / 2;
    const radiusY = Math.abs(rect[3] - rect[1]) / 2;

    context.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    context.stroke();
  };

  const drawFreeTextAnnotation = (
    context: CanvasRenderingContext2D,
    rect: number[],
    color: { r: number; g: number; b: number },
    text: string
  ) => {
    context.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    context.font = "16px Arial";
    context.fillText(text, rect[0], rect[1]);
  };

  const drawStrikeOutAnnotation = (
    context: CanvasRenderingContext2D,
    rect: number[],
    color: { r: number; g: number; b: number }
  ) => {
    context.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(rect[0], rect[1] + (rect[3] - rect[1]) / 2);
    context.lineTo(rect[2], rect[1] + (rect[3] - rect[1]) / 2);
    context.stroke();
  };

  const drawPolygonAnnotation = (
    context: CanvasRenderingContext2D,
    vertices: number[],
    color: { r: number; g: number; b: number }
  ) => {
    context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`;
    context.beginPath();
    context.moveTo(vertices[0], vertices[1]);
    for (let i = 2; i < vertices.length; i += 2) {
      context.lineTo(vertices[i], vertices[i + 1]);
    }
    context.closePath();
    context.fill();
  };

  const handleClearAnnotations = () => {
    setAnnotations([]);
    renderPage(currentPage);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // console.log("Adding event listeners: ", canvas);
    canvas.addEventListener("mousedown", handleCanvasMouseDown);
    canvas.addEventListener("mouseup", handleCanvasMouseUp);
    canvas.addEventListener("mousemove", handleCanvasMouseMove);

    return () => {
      canvas.removeEventListener("mousedown", handleCanvasMouseDown);
      canvas.removeEventListener("mouseup", handleCanvasMouseUp);
      canvas.removeEventListener("mousemove", handleCanvasMouseMove);
    };
  }, [
    isDrawing,
    startPointCanvas,
    selectedTool,
    currentPage,
    pdfFactory,
    annotations,
  ]); // Thêm annotations

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages));
  };

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

  useEffect(() => {
    console.log("Current annotations:", annotations);
  }, [annotations]);

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className="w-full flex gap-4 items-center">
        <div className="w-full grid grid-cols-12 gap-4">
          <div className="col-span-12">
            <PdfToolbar
              selectedTool={selectedTool}
              onSelectTool={setSelectedTool}
              onDownload={handleAddAnnotation}
              onClearAnno={handleClearAnnotations}
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
                <canvas
                  ref={tempCanvasRef}
                  className="absolute top-0 left-0 pointer-events-none"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                  }}
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
