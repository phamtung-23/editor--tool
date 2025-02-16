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

const PdfAnnotator = ({ pdfUrl }: PdfAnnotatorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfFactory, setPdfFactory] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale] = useState(1.5);

  // const [pdfjsLibVar, setPdfjsLibVar] = useState<any>(null);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [selectedTool, setSelectedTool] = useState<AnnotationType | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );

  useEffect(() => {
    loadPdf();
  }, [pdfUrl]);

  useEffect(() => {
    if (numPages > 0) {
      renderPage(currentPage);
    }
  }, [currentPage, numPages]);

  const loadPdf = async () => {
    try {
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdfDocument = await loadingTask.promise;

      // Initialize annotation factory
      const pdfData = await pdfDocument.getData();
      const factory = new AnnotationFactory(pdfData);

      // Get existing annotations
      const existingAnnotations = await factory.getAnnotations();
      setAnnotations(existingAnnotations);

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
      const context = canvas.getContext("2d");

      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Clear the canvas
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Render PDF page
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // Render annotations for current page
      renderAnnotations(context, pageNumber - 1, viewport);
    } catch (error) {
      console.error("Error rendering page:", error);
    }
  };

  const renderAnnotations = (
    context: CanvasRenderingContext2D,
    pageIndex: number,
    viewport: any
  ) => {
    // Filter annotations for current page
    const pageAnnotations = annotations.filter(
      (anno) => anno.page === pageIndex
    );

    pageAnnotations.forEach((annotation) => {
      const rect = annotation.rect.map((coord: number) => coord * scale);

      context.save();

      switch (annotation.type) {
        case "text":
          drawTextAnnotation(context, rect, annotation.color);
          break;
        case "highlight":
          drawHighlightAnnotation(context, rect, annotation.color);
          break;
        case "underline":
          drawUnderlineAnnotation(context, rect, annotation.color);
          break;
        case "square":
          drawSquareAnnotation(context, rect, annotation.color);
          break;
        case "circle":
          drawCircleAnnotation(context, rect, annotation.color);
          break;
        case "freetext":
          drawFreeTextAnnotation(
            context,
            rect,
            annotation.color,
            annotation.contents
          );
          break;
        case "strikeout":
          drawStrikeOutAnnotation(context, rect, annotation.color);
          break;
        case "polygon":
          drawPolygonAnnotation(
            context,
            annotation.vertices.map((v: number) => v * scale),
            annotation.color
          );
          break;
      }

      context.restore();
    });
  };

  const drawTextAnnotation = (
    context: CanvasRenderingContext2D,
    rect: number[],
    color: { r: number; g: number; b: number }
  ) => {
    context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`;
    context.fillRect(rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]);

    // Add note icon
    context.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    context.beginPath();
    const size = 15;
    context.moveTo(rect[0], rect[1]);
    context.lineTo(rect[0] + size, rect[1]);
    context.lineTo(rect[0] + size, rect[1] + size);
    context.lineTo(rect[0], rect[1] + size);
    context.closePath();
    context.fill();
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

    // Add semi-transparent fill
    context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.1)`;
    context.fillRect(rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]);
  };

  const drawCircleAnnotation = (
    context: CanvasRenderingContext2D,
    rect: number[],
    color: { r: number; g: number; b: number }
  ) => {
    const centerX = (rect[0] + rect[2]) / 2;
    const centerY = (rect[1] + rect[3]) / 2;
    const radiusX = (rect[2] - rect[0]) / 2;
    const radiusY = (rect[3] - rect[1]) / 2;

    context.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    context.stroke();

    // Add semi-transparent fill
    context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.1)`;
    context.fill();
  };

  const drawFreeTextAnnotation = (
    context: CanvasRenderingContext2D,
    rect: number[],
    color: { r: number; g: number; b: number },
    text: string
  ) => {
    // Draw text background
    context.fillStyle = `rgba(255, 255, 255, 0.8)`;
    context.fillRect(rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]);

    // Draw border
    context.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    context.lineWidth = 1;
    context.strokeRect(rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]);

    // Draw text
    context.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    context.font = "14px Arial";
    context.textBaseline = "middle";
    context.textAlign = "center";
    const centerX = (rect[0] + rect[2]) / 2;
    const centerY = (rect[1] + rect[3]) / 2;

    // Word wrap text if needed
    const maxWidth = rect[2] - rect[0] - 10;
    const words = text.split(" ");
    let line = "";
    let lines = [];

    for (let word of words) {
      const testLine = line + word + " ";
      const metrics = context.measureText(testLine);

      if (metrics.width > maxWidth && line !== "") {
        lines.push(line);
        line = word + " ";
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    // Draw wrapped text
    const lineHeight = 18;
    const totalHeight = lines.length * lineHeight;
    let y = centerY - totalHeight / 2 + lineHeight / 2;

    lines.forEach((line) => {
      context.fillText(line.trim(), centerX, y);
      y += lineHeight;
    });
  };

  const drawStrikeOutAnnotation = (
    context: CanvasRenderingContext2D,
    rect: number[],
    color: { r: number; g: number; b: number }
  ) => {
    context.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    context.lineWidth = 2;
    context.beginPath();

    // Draw strike-through line in the middle of the rectangle
    const middleY = (rect[1] + rect[3]) / 2;
    context.moveTo(rect[0], middleY);
    context.lineTo(rect[2], middleY);
    context.stroke();
  };

  const drawPolygonAnnotation = (
    context: CanvasRenderingContext2D,
    vertices: number[],
    color: { r: number; g: number; b: number }
  ) => {
    if (vertices.length < 4) return; // Need at least 2 points (4 coordinates)

    context.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.1)`;
    context.lineWidth = 2;

    context.beginPath();
    context.moveTo(vertices[0], vertices[1]);

    // Draw lines between vertices
    for (let i = 2; i < vertices.length; i += 2) {
      context.lineTo(vertices[i], vertices[i + 1]);
    }

    // Close the polygon
    context.closePath();
    context.stroke();
    context.fill();
  };

  // Helper function to draw preview while creating annotations
  const drawAnnotationPreview = (
    context: CanvasRenderingContext2D,
    startPoint: { x: number; y: number },
    currentPoint: { x: number; y: number },
    annotationType: AnnotationType,
    color: { r: number; g: number; b: number }
  ) => {
    const rect = [startPoint.x, startPoint.y, currentPoint.x, currentPoint.y];

    context.save();
    context.globalAlpha = 0.6;

    switch (annotationType) {
      case AnnotationType.TEXT:
        drawTextAnnotation(context, rect, color);
        break;
      case AnnotationType.HIGHLIGHT:
        drawHighlightAnnotation(context, rect, color);
        break;
      case AnnotationType.UNDERLINE:
        drawUnderlineAnnotation(context, rect, color);
        break;
      case AnnotationType.SQUARE:
        drawSquareAnnotation(context, rect, color);
        break;
      case AnnotationType.CIRCLE:
        drawCircleAnnotation(context, rect, color);
        break;
      case AnnotationType.FREETEXT:
        drawFreeTextAnnotation(context, rect, color, "Preview");
        break;
      case AnnotationType.STRIKEOUT:
        drawStrikeOutAnnotation(context, rect, color);
        break;
      case AnnotationType.POLYGON:
        // For polygon preview, draw lines between points
        const vertices = [
          startPoint.x,
          startPoint.y,
          currentPoint.x,
          currentPoint.y,
        ];
        drawPolygonAnnotation(context, vertices, color);
        break;
    }

    context.restore();
  };

  // Add similar drawing functions for other annotation types...

  // Add this state for polygon points
  interface Point {
    x: number;
    y: number;
  }

  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);

  // Update handleCanvasMouseDown for polygon
  const handleCanvasMouseDown = (event: MouseEvent) => {
    if (!selectedTool || !canvasRef.current) return;

    const pos = getMousePosition(event);

    if (selectedTool === AnnotationType.POLYGON) {
      if (event.button === 2) {
        // Right click
        // Complete polygon if we have at least 3 points
        if (polygonPoints.length >= 3) {
          handleCompletePolygon();
        }
        return;
      }
      // Add point to polygon
      setPolygonPoints((prev) => [...prev, pos]);
      return;
    }

    setIsDrawing(true);
    setStartPoint(pos);
  };

  // Add function to handle polygon completion
  const handleCompletePolygon = async () => {
    if (!pdfFactory || polygonPoints.length < 3) return;

    try {
      // Convert points to PDF space
      const vertices = polygonPoints.flatMap((point) => [
        point.x / scale,
        point.y / scale,
      ]);

      // Calculate bounding box
      const xCoords = polygonPoints.map((p) => p.x);
      const yCoords = polygonPoints.map((p) => p.y);
      const rect = [
        Math.min(...xCoords) / scale,
        Math.min(...yCoords) / scale,
        Math.max(...xCoords) / scale,
        Math.max(...yCoords) / scale,
      ];

      // Create polygon annotation
      pdfFactory.createPolygonAnnotation({
        page: currentPage - 1,
        rect: rect,
        vertices: vertices,
        contents: "Polygon annotation",
        author: "User",
        color: { r: 128, g: 0, b: 128 },
      });

      // Clear polygon points
      setPolygonPoints([]);

      // Re-render the page
      await renderPage(currentPage);
    } catch (error) {
      console.error("Error creating polygon annotation:", error);
    }
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
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  // const handleCanvasMouseDown = (event: MouseEvent) => {
  //   if (!selectedTool || !canvasRef.current) return;

  //   setIsDrawing(true);
  //   const pos = getMousePosition(event);
  //   setStartPoint(pos);
  // };

  const handleCanvasMouseUp = async (event: MouseEvent) => {
    if (!isDrawing || !startPoint || !selectedTool || !pdfFactory) return;

    const endPoint = getMousePosition(event);
    setIsDrawing(false);

    // Convert coordinates to PDF space
    const rect = [startPoint.x, startPoint.y, endPoint.x, endPoint.y].map(
      (coord) => coord / scale
    );

    try {
      let newAnnotation;

      switch (selectedTool) {
        case AnnotationType.TEXT:
          pdfFactory.createTextAnnotation({
            page: currentPage - 1,
            rect: rect,
            contents: "Text annotation",
            author: "User",
            color: { r: 255, g: 0, b: 0 },
          });
          break;

        case AnnotationType.HIGHLIGHT:
          pdfFactory.createHighlightAnnotation({
            page: currentPage - 1,
            rect: rect,
            contents: "Highlight annotation",
            author: "User",
            color: { r: 255, g: 255, b: 0 },
          });
          break;

        case AnnotationType.UNDERLINE:
          pdfFactory.createUnderlineAnnotation({
            page: currentPage - 1,
            rect: rect,
            contents: "Underline annotation",
            author: "User",
            color: { r: 0, g: 0, b: 255 },
          });
          break;

        case AnnotationType.SQUARE:
          pdfFactory.createSquareAnnotation({
            page: currentPage - 1,
            rect: rect,
            contents: "Square annotation",
            author: "User",
            color: { r: 0, g: 255, b: 0 },
          });
          break;

        case AnnotationType.CIRCLE:
          pdfFactory.createCircleAnnotation({
            page: currentPage - 1,
            rect: rect,
            contents: "Circle annotation",
            author: "User",
            color: { r: 255, g: 0, b: 255 },
          });
          break;

        case AnnotationType.FREETEXT:
          const text = prompt("Enter text:", "");
          if (text) {
            pdfFactory.createFreeTextAnnotation({
              page: currentPage - 1,
              rect: rect,
              contents: text,
              author: "User",
              color: { r: 0, g: 0, b: 0 },
            });
          }
          break;

        case AnnotationType.STRIKEOUT:
          pdfFactory.createStrikeOutAnnotation({
            page: currentPage - 1,
            rect: rect,
            contents: "Strike out annotation",
            author: "User",
            color: { r: 255, g: 0, b: 0 },
          });
          break;

        case AnnotationType.POLYGON:
          pdfFactory.createPolygonAnnotation({
            page: currentPage - 1,
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
            contents: "Polygon annotation",
            author: "User",
            color: { r: 128, g: 0, b: 128 },
          });
          break;
      }

      if (newAnnotation) {
        setAnnotations((prev) => [...prev, newAnnotation]);
        await renderPage(currentPage);
      }
    } catch (error) {
      console.error("Error creating annotation:", error);
    }
  };

  const handleCanvasMouseMove = (event: MouseEvent) => {
    if (!isDrawing || !startPoint || !selectedTool) return;

    const currentPoint = getMousePosition(event);
    const context = canvasRef.current?.getContext("2d");

    if (context) {
      // Clear previous preview
      renderPage(currentPage);

      // Draw preview
      context.save();
      context.globalAlpha = 0.5;

      const previewRect: [number, number, number, number] = [
        startPoint.x,
        startPoint.y,
        currentPoint.x - startPoint.x,
        currentPoint.y - startPoint.y,
      ];

      // Draw preview based on selected tool
      switch (selectedTool) {
        case AnnotationType.SQUARE:
          context.strokeStyle = "rgb(0, 255, 0)";
          context.strokeRect(...previewRect);
          break;
        // Add cases for other annotation types...
      }

      context.restore();
    }
  };

// Update component cleanup
useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const handleContextMenu = (e: Event) => {
    if (selectedTool === AnnotationType.POLYGON) {
      e.preventDefault();
    }
  };

  canvas.addEventListener('mousedown', handleCanvasMouseDown);
  canvas.addEventListener('mouseup', handleCanvasMouseUp);
  canvas.addEventListener('mousemove', handleCanvasMouseMove);
  canvas.addEventListener('contextmenu', handleContextMenu);

  return () => {
    canvas.removeEventListener('mousedown', handleCanvasMouseDown);
    canvas.removeEventListener('mouseup', handleCanvasMouseUp);
    canvas.removeEventListener('mousemove', handleCanvasMouseMove);
    canvas.removeEventListener('contextmenu', handleContextMenu);
  };
}, [isDrawing, startPoint, selectedTool, currentPage, pdfFactory, polygonPoints]);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages));
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <PdfToolbar selectedTool={selectedTool} onSelectTool={setSelectedTool} />

      <div className="relative border border-gray-300 rounded-lg shadow-lg">
        <canvas
          ref={canvasRef}
          className="max-w-full"
          style={{ cursor: selectedTool ? "crosshair" : "default" }}
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
      </div>
    </div>
  );
};

export default PdfAnnotator;
