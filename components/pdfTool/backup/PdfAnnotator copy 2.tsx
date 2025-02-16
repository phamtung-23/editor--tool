"use client";

import { useEffect, useRef, useState } from "react";
import { AnnotationFactory } from "annotpdf";
import * as pdfjsLib from "pdfjs-dist";

import dynamic from "next/dynamic";
import PdfToolbar from "./toolbars/PdfToolbar";
import { AnnotationType } from "@/types/annotations";

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

const PdfAnnotator = ({ pdfUrl }: PdfAnnotatorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfFactory, setPdfFactory] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale] = useState(1.5);

  // const [pdfjsLibVar, setPdfjsLibVar] = useState<any>(null);
  const [selectedTool, setSelectedTool] = useState<AnnotationType | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );

  const tempCanvasRef = useRef<HTMLCanvasElement>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

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
      renderPage(1);
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
    console.log("Rendering annotations:", annotations); // Debug log
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
      pdfFactory.createTextAnnotation({
        page: currentPage - 1, // PDF pages are 0-based
        rect: [50, 50, 80, 80],
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
    console.log("Mouse position");
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    console.log(event.clientX - rect.left, event.clientY - rect.top);
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handleCanvasMouseDown = (event: MouseEvent) => {
    if (!selectedTool || !canvasRef.current) return;
    console.log("Mouse down");
    setIsDrawing(true);
    const pos = getMousePosition(event);
    setStartPoint(pos);
  };

  const handleCanvasMouseUp = async (event: MouseEvent) => {
    if (!isDrawing || !startPoint || !selectedTool || !pdfFactory) return;

    const endPoint = getMousePosition(event);
    setIsDrawing(false);

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

    const rect = [
      Math.min(startPoint.x, endPoint.x),
      Math.min(startPoint.y, endPoint.y),
      Math.max(startPoint.x, endPoint.x),
      Math.max(startPoint.y, endPoint.y),
    ];

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
        setAnnotations((prev) => [...prev, newAnnotation]);
      }
    } catch (error) {
      console.error("Error creating annotation:", error);
    }
  };

  // const handleCanvasMouseUp = async (event: MouseEvent) => {
  //   if (!isDrawing || !startPoint || !selectedTool || !pdfFactory) return;

  //   const endPoint = getMousePosition(event);
  //   setIsDrawing(false);

  //   // Clear preview
  //   const tempContext = tempCanvasRef.current?.getContext("2d");
  //   if (tempContext) {
  //     tempContext.clearRect(
  //       0,
  //       0,
  //       tempCanvasRef.current!.width,
  //       tempCanvasRef.current!.height
  //     );
  //   }

  //   // Convert coordinates to PDF space
  //   const rect = [startPoint.x, startPoint.y, endPoint.x, endPoint.y].map(
  //     (coord) => coord / scale
  //   );

  //   try {
  //     let newAnnotation: Annotation | null = null;

  //     switch (selectedTool) {
  //       case AnnotationType.TEXT:
  //         newAnnotation = {
  //           type: AnnotationType.TEXT,
  //           rect: rect,
  //           color: { r: 255, g: 0, b: 0 },
  //         };
  //         pdfFactory.createTextAnnotation({
  //           page: currentPage - 1,
  //           rect: rect,
  //           contents: "Text annotation",
  //           author: "User",
  //           color: { r: 255, g: 0, b: 0 },
  //         });
  //         break;

  //       case AnnotationType.HIGHLIGHT:
  //         newAnnotation = {
  //           type: AnnotationType.HIGHLIGHT,
  //           rect: rect,
  //           color: { r: 255, g: 255, b: 0 },
  //         };
  //         pdfFactory.createHighlightAnnotation({
  //           page: currentPage - 1,
  //           rect: rect,
  //           contents: "Highlight annotation",
  //           author: "User",
  //           color: { r: 255, g: 255, b: 0 },
  //         });
  //         break;

  //       case AnnotationType.UNDERLINE:
  //         newAnnotation = {
  //           type: AnnotationType.UNDERLINE,
  //           rect: rect,
  //           color: { r: 0, g: 0, b: 255 },
  //         };
  //         pdfFactory.createUnderlineAnnotation({
  //           page: currentPage - 1,
  //           rect: rect,
  //           contents: "Underline annotation",
  //           author: "User",
  //           color: { r: 0, g: 0, b: 255 },
  //         });
  //         break;

  //       case AnnotationType.SQUARE:
  //         newAnnotation = {
  //           type: AnnotationType.SQUARE,
  //           rect: rect,
  //           color: { r: 0, g: 255, b: 0 },
  //         };
  //         pdfFactory.createSquareAnnotation({
  //           page: currentPage - 1,
  //           rect: rect,
  //           contents: "Square annotation",
  //           author: "User",
  //           color: { r: 0, g: 255, b: 0 },
  //         });
  //         break;

  //       case AnnotationType.CIRCLE:
  //         newAnnotation = {
  //           type: AnnotationType.CIRCLE,
  //           rect: rect,
  //           color: { r: 255, g: 0, b: 255 },
  //         };
  //         pdfFactory.createCircleAnnotation({
  //           page: currentPage - 1,
  //           rect: rect,
  //           contents: "Circle annotation",
  //           author: "User",
  //           color: { r: 255, g: 0, b: 255 },
  //         });
  //         break;

  //       case AnnotationType.FREETEXT:
  //         const text = prompt("Enter text:", "");
  //         if (text) {
  //           newAnnotation = {
  //             type: AnnotationType.FREETEXT,
  //             rect: rect,
  //             color: { r: 0, g: 0, b: 0 },
  //             contents: text,
  //           };
  //           pdfFactory.createFreeTextAnnotation({
  //             page: currentPage - 1,
  //             rect: rect,
  //             contents: text,
  //             author: "User",
  //             color: { r: 0, g: 0, b: 0 },
  //           });
  //         }
  //         break;

  //       case AnnotationType.STRIKEOUT:
  //         newAnnotation = {
  //           type: AnnotationType.STRIKEOUT,
  //           rect: rect,
  //           color: { r: 255, g: 0, b: 0 },
  //         };
  //         pdfFactory.createStrikeOutAnnotation({
  //           page: currentPage - 1,
  //           rect: rect,
  //           contents: "Strike out annotation",
  //           author: "User",
  //           color: { r: 255, g: 0, b: 0 },
  //         });
  //         break;

  //       case AnnotationType.POLYGON:
  //         newAnnotation = {
  //           type: AnnotationType.POLYGON,
  //           rect: rect,
  //           vertices: [
  //             rect[0],
  //             rect[1],
  //             rect[2],
  //             rect[1],
  //             rect[2],
  //             rect[3],
  //             rect[0],
  //             rect[3],
  //           ],
  //           color: { r: 128, g: 0, b: 128 },
  //         };
  //         pdfFactory.createPolygonAnnotation({
  //           page: currentPage - 1,
  //           rect: rect,
  //           vertices: [
  //             rect[0],
  //             rect[1],
  //             rect[2],
  //             rect[1],
  //             rect[2],
  //             rect[3],
  //             rect[0],
  //             rect[3],
  //           ],
  //           contents: "Polygon annotation",
  //           author: "User",
  //           color: { r: 128, g: 0, b: 128 },
  //         });
  //         break;
  //     }

  //     if (newAnnotation) {
  //       setAnnotations((prev) => [...prev, newAnnotation]);
  //     }
  //   } catch (error) {
  //     console.error("Error creating annotation:", error);
  //   }
  // };

  // const handleCanvasMouseUp = async (event: MouseEvent) => {
  //   console.log("Mouse up");
  //   if (!isDrawing || !startPoint || !selectedTool || !pdfFactory) return;

  //   const endPoint = getMousePosition(event);
  //   setIsDrawing(false);

  //   // Convert coordinates to PDF space
  //   const rect = [startPoint.x, startPoint.y, endPoint.x, endPoint.y].map(
  //     (coord) => coord / scale
  //   );

  //   try {
  //     switch (selectedTool) {
  //       case AnnotationType.TEXT:
  //         pdfFactory.createTextAnnotation({
  //           page: currentPage - 1,
  //           rect: rect,
  //           contents: "Text annotation",
  //           author: "User",
  //           color: { r: 255, g: 0, b: 0 },
  //         });
  //         break;

  //       case AnnotationType.HIGHLIGHT:
  //         pdfFactory.createHighlightAnnotation({
  //           page: currentPage - 1,
  //           rect: rect,
  //           contents: "Highlight annotation",
  //           author: "User",
  //           color: { r: 255, g: 255, b: 0 },
  //         });
  //         break;

  //       case AnnotationType.UNDERLINE:
  //         pdfFactory.createUnderlineAnnotation({
  //           page: currentPage - 1,
  //           rect: rect,
  //           contents: "Underline annotation",
  //           author: "User",
  //           color: { r: 0, g: 0, b: 255 },
  //         });
  //         break;

  //       case AnnotationType.SQUARE:
  //         pdfFactory.createSquareAnnotation({
  //           page: currentPage - 1,
  //           rect: rect,
  //           contents: "Square annotation",
  //           author: "User",
  //           color: { r: 0, g: 255, b: 0 },
  //         });
  //         break;

  //       case AnnotationType.CIRCLE:
  //         pdfFactory.createCircleAnnotation({
  //           page: currentPage - 1,
  //           rect: rect,
  //           contents: "Circle annotation",
  //           author: "User",
  //           color: { r: 255, g: 0, b: 255 },
  //         });
  //         break;

  //       case AnnotationType.FREETEXT:
  //         const text = prompt("Enter text:", "");
  //         if (text) {
  //           pdfFactory.createFreeTextAnnotation({
  //             page: currentPage - 1,
  //             rect: rect,
  //             contents: text,
  //             author: "User",
  //             color: { r: 0, g: 0, b: 0 },
  //           });
  //         }
  //         break;

  //       case AnnotationType.STRIKEOUT:
  //         pdfFactory.createStrikeOutAnnotation({
  //           page: currentPage - 1,
  //           rect: rect,
  //           contents: "Strike out annotation",
  //           author: "User",
  //           color: { r: 255, g: 0, b: 0 },
  //         });
  //         break;

  //       case AnnotationType.POLYGON:
  //         pdfFactory.createPolygonAnnotation({
  //           page: currentPage - 1,
  //           rect: rect,
  //           vertices: [
  //             rect[0],
  //             rect[1],
  //             rect[2],
  //             rect[1],
  //             rect[2],
  //             rect[3],
  //             rect[0],
  //             rect[3],
  //           ],
  //           contents: "Polygon annotation",
  //           author: "User",
  //           color: { r: 128, g: 0, b: 128 },
  //         });
  //         break;
  //     }

  //     // Re-render the current page to show the new annotation
  //     await renderPage(currentPage);
  //   } catch (error) {
  //     console.error("Error creating annotation:", error);
  //   }
  // };

  const drawTextAnnotation = (
    context: CanvasRenderingContext2D,
    rect: number[],
    color: { r: number; g: number; b: number }
  ) => {
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

  const handleCanvasMouseMove = (event: MouseEvent) => {
    if (!isDrawing || !startPoint || !selectedTool) return;

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

      const previewRect = [
        startPoint.x,
        startPoint.y,
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
            [startPoint.x, startPoint.y, currentPoint.x, currentPoint.y],
            { r: 128, g: 0, b: 128 }
          );
          break;
        // Add cases for other annotation types...
      }
    }
  };

  // const handleCanvasMouseMove = (event: MouseEvent) => {
  //   if (!isDrawing || !startPoint || !selectedTool) return;

  //   const currentPoint = getMousePosition(event);
  //   const tempContext = tempCanvasRef.current?.getContext("2d");

  //   if (tempContext) {
  //     // Clear previous preview
  //     tempContext.clearRect(
  //       0,
  //       0,
  //       tempCanvasRef.current!.width,
  //       tempCanvasRef.current!.height
  //     );

  //     // Draw preview
  //     tempContext.save();
  //     tempContext.globalAlpha = 0.5;

  //     switch (selectedTool) {
  //       case AnnotationType.TEXT:
  //         tempContext.fillStyle = "rgba(255, 0, 0, 0.3)";
  //         tempContext.fillRect(
  //           startPoint.x,
  //           startPoint.y,
  //           currentPoint.x - startPoint.x,
  //           currentPoint.y - startPoint.y
  //         );
  //         break;

  //       case AnnotationType.HIGHLIGHT:
  //         tempContext.fillStyle = "rgba(255, 255, 0, 0.3)";
  //         tempContext.fillRect(
  //           startPoint.x,
  //           startPoint.y,
  //           currentPoint.x - startPoint.x,
  //           currentPoint.y - startPoint.y
  //         );
  //         break;

  //       case AnnotationType.UNDERLINE:
  //         tempContext.strokeStyle = "rgb(0, 0, 255)";
  //         tempContext.lineWidth = 1;
  //         tempContext.beginPath();
  //         tempContext.moveTo(startPoint.x, currentPoint.y);
  //         tempContext.lineTo(currentPoint.x, currentPoint.y);
  //         tempContext.stroke();
  //         break;

  //       case AnnotationType.SQUARE:
  //         tempContext.strokeStyle = "rgb(0, 255, 0)";
  //         tempContext.lineWidth = 2;
  //         tempContext.strokeRect(
  //           startPoint.x,
  //           startPoint.y,
  //           currentPoint.x - startPoint.x,
  //           currentPoint.y - startPoint.y
  //         );
  //         break;

  //       case AnnotationType.CIRCLE:
  //         const centerX = (startPoint.x + currentPoint.x) / 2;
  //         const centerY = (startPoint.y + currentPoint.y) / 2;
  //         const radiusX = Math.abs(currentPoint.x - startPoint.x) / 2;
  //         const radiusY = Math.abs(currentPoint.y - startPoint.y) / 2;

  //         tempContext.strokeStyle = "rgb(255, 0, 255)";
  //         tempContext.lineWidth = 2;
  //         tempContext.beginPath();
  //         tempContext.ellipse(
  //           centerX,
  //           centerY,
  //           radiusX,
  //           radiusY,
  //           0,
  //           0,
  //           2 * Math.PI
  //         );
  //         tempContext.stroke();
  //         break;

  //       // Các annotation type khác...
  //     }

  //     tempContext.restore();
  //   }
  // };

  const handleClearAnnotations = () => {
    setAnnotations([]);
    renderPage(currentPage);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
    startPoint,
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

  useEffect(() => {
    console.log("Current annotations:", annotations);
  }, [annotations]);

  return (
    <div className="flex flex-col items-center gap-4">
      <PdfToolbar selectedTool={selectedTool} onSelectTool={setSelectedTool} />

      <div className="relative border border-gray-300 rounded-lg shadow-lg">
        <canvas
          ref={canvasRef}
          className="max-w-full"
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

      <div className="flex gap-4 items-center">
        <button
          onClick={() => pdfFactory?.download("annotated.pdf")}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Download PDF
        </button>

        <button
          onClick={handlePreviousPage}
          disabled={currentPage <= 1}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {numPages}
        </span>
        <button
          onClick={handleNextPage}
          disabled={currentPage >= numPages}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          Next
        </button>
        <button
          onClick={handleClearAnnotations}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Clear Annotations
        </button>
      </div>
    </div>
  );
};

export default PdfAnnotator;
