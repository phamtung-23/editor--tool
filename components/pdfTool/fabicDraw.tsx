"use client";

import { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Save,
  Trash2,
  Upload,
  Square,
  Pen,
  PenLine,
  Type,
  Italic,
  Underline,
  Bold,
  Circle,
  MoveRight,
  Pin,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import BookmarkSidebar from "./toolbars/bookmark";
import AnnotationSidebar from "./toolbars/annotationList";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Shadow {
  blur: number;
  offsetX: number;
  offsetY: number;
  affectStroke: boolean;
  color: string;
}

interface Bookmark {
  title: string;
  pageRef: number;
}

const CanvasApp = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [textInput, setTextInput] = useState<string>("");

  const [lineWidth, setLineWidth] = useState<number>(30);
  const [shadowWidth, setShadowWidth] = useState<number>(0);
  const [shadowOffset, setShadowOffset] = useState<number>(0);
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [openAddText, setOpenAddText] = useState<boolean>(false);

  const [isObjectSelected, setIsObjectSelected] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [loadImport, setLoadImport] = useState<boolean>(false);

  // PDF-specific state
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pdfScale, setPdfScale] = useState<number>(1.0);

  // Bookmark state
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const imageUrl =
    "https://letsenhance.io/static/8f5e523ee6b2479e26ecc91b9c25261e/1015f/MainAfter.jpg";
  const image = new Image();
  image.src = imageUrl;

  const initializePatternBrushes = (canvas: fabric.Canvas) => {
    // vLine pattern brush
    const vLinePatternBrush = new fabric.PatternBrush(canvas);
    vLinePatternBrush.getPatternSrc = function (this: fabric.PatternBrush) {
      const patternCanvas = document.createElement("canvas");
      patternCanvas.width = patternCanvas.height = 10;
      const ctx = patternCanvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = this.color || "";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.lineTo(10, 5);
        ctx.closePath();
        ctx.stroke();
      }
      return patternCanvas;
    };

    // hLine pattern brush
    const hLinePatternBrush = new fabric.PatternBrush(canvas);
    hLinePatternBrush.getPatternSrc = function (this: fabric.PatternBrush) {
      const patternCanvas = document.createElement("canvas");
      patternCanvas.width = patternCanvas.height = 10;
      const ctx = patternCanvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = this.color || "";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(5, 10);
        ctx.closePath();
        ctx.stroke();
      }
      return patternCanvas;
    };

    // Store brushes in component instance
    (canvas as any).vLinePatternBrush = vLinePatternBrush;
    (canvas as any).hLinePatternBrush = hLinePatternBrush;
  };

  const initFabricCanvas = (width: number, height: number) => {
    if (!canvasRef.current) return;
    // Initialize canvas
    fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
      width: width,
      height: height,
      isDrawingMode: false,
    });

    fabricCanvasRef.current.freeDrawingBrush = new fabric.PencilBrush(
      fabricCanvasRef.current
    );
    fabric.Object.prototype.transparentCorners = false;

    // Add selection event listeners
    fabricCanvasRef.current.on("selection:created", () => {
      console.log("selection:created");
      setIsObjectSelected(true);
    });
    fabricCanvasRef.current.on("selection:updated", () => {
      console.log("selection:updated");
      setIsObjectSelected(true);
    });
    fabricCanvasRef.current.on("selection:cleared", () => {
      console.log("selection:cleared");
      setIsObjectSelected(false);
    });

    // Add right-click context menu
    // @ts-ignore
    fabricCanvasRef.current.on("mouse:down", (e: fabric.IEvent) => {
      if (e.e instanceof MouseEvent && e.e.button === 2) {
        // Right click
        if (fabricCanvasRef.current) {
          const pointer = fabricCanvasRef.current.getPointer(e.e);
          e.e.preventDefault();
        }
        e.e.preventDefault();
      } else {
        setContextMenu(null);
      }
    });

    // Add keyboard event listener for delete
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelectedObject();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Initialize pattern brushes
    if (fabric.PatternBrush) {
      initializePatternBrushes(fabricCanvasRef.current);
    }
    // Initial brush settings
    if (fabricCanvasRef.current.freeDrawingBrush) {
      fabricCanvasRef.current.freeDrawingBrush.width = lineWidth;
      fabricCanvasRef.current.freeDrawingBrush.shadow = new fabric.Shadow({
        blur: shadowWidth,
        offsetX: 0,
        offsetY: 0,
        affectStroke: true,
        color: "#000000",
      });
    }

    fabricCanvasRef.current.backgroundColor = "#f0f0f0";
    fabricCanvasRef.current.renderAll();
  };

  useEffect(() => {
    // Initialize the canvas
    initFabricCanvas(600, 800);

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }
    };
  }, []);

  // New function to handle PDF file upload
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    if (file.type === "application/pdf") {
      const fileReader = new FileReader();
      fileReader.onload = async function () {
        if (fileReader.result instanceof ArrayBuffer) {
          try {
            const loadingTask = pdfjsLib.getDocument({
              data: fileReader.result,
            });
            const pdfDoc = await loadingTask.promise;
            setPdfDocument(pdfDoc);
            setNumPages(pdfDoc.numPages);
            setCurrentPage(1);
            // Clear existing canvas
            if (fabricCanvasRef.current) {
              fabricCanvasRef.current.clear();
              renderPdfPage(1, pdfDoc);
            }
          } catch (error) {
            console.error("Error loading PDF:", error);
          }
        }
      };
      fileReader.readAsArrayBuffer(file);
    }
  };
  const renderPdfPage = async (pageNumber: number, pdfDoc: any) => {
    if (!fabricCanvasRef.current || !pdfDoc) return;

    try {
      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: pdfScale });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }

      if (canvasRef.current) {
        fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
          width: viewport.width,
          height: viewport.height,
          isDrawingMode: false,
        });
      }

      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }

      initFabricCanvas(viewport.width, viewport.height);

      const img = new Image();
      img.src = canvas.toDataURL();

      img.onload = () => {
        const fabricImage = new fabric.Image(img, {
          left: 0,
          top: 0,
          originX: "left",
          originY: "top",
          width: img.width,
          height: img.height,
          selectable: false,
        });

        fabricCanvasRef.current?.clear();
        fabricCanvasRef.current?.add(fabricImage);
        fabricCanvasRef.current?.renderAll();
      };
    } catch (error) {
      console.error("Error rendering PDF:", error);
    }
  };

  // Updated function to change PDF page
  const changePage = async (delta: number) => {
    const newPage = currentPage + delta;
    if (pdfDocument && newPage >= 1 && newPage <= numPages!) {
      setCurrentPage(newPage);
      await renderPdfPage(newPage, pdfDocument);
    }
  };

  // Effect to handle scale changes
  useEffect(() => {
    if (pdfDocument && currentPage) {
      renderPdfPage(currentPage, pdfDocument);
    }
  }, [pdfScale]);

  const deleteSelectedObject = () => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const activeObjects = canvas.getActiveObjects();

    if (activeObjects.length > 0) {
      activeObjects.forEach((obj) => {
        canvas.remove(obj);
      });
      canvas.discardActiveObject();
      canvas.renderAll();
      setIsObjectSelected(false);
    }
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const value = e.target.value;

    if (value === "hline") {
      canvas.freeDrawingBrush = (canvas as any).vLinePatternBrush;
    } else if (value === "vline") {
      canvas.freeDrawingBrush = (canvas as any).hLinePatternBrush;
    } else {
      canvas.freeDrawingBrush = new (fabric as any)[value + "Brush"](canvas);
    }

    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = lineWidth;
      canvas.freeDrawingBrush.shadow = new fabric.Shadow({
        blur: shadowWidth,
        offsetX: shadowOffset,
        offsetY: shadowOffset,
        affectStroke: true,
        color: "#000000",
      });
    }
  };

  const toggleDrawingMode = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = !canvas.isDrawingMode;
    setIsDrawingMode(canvas.isDrawingMode);
  };

  const addRectangle = (): void => {
    if (!fabricCanvasRef.current) return;

    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      fill: "transparent",
      opacity: 1,
      stroke: "#000",
      strokeWidth: 3,
    });

    fabricCanvasRef.current.add(rect);
    fabricCanvasRef.current.setActiveObject(rect);
    fabricCanvasRef.current.renderAll();
  };

  const addCircle = (): void => {
    if (!fabricCanvasRef.current) return;

    const circle = new fabric.Circle({
      left: 100,
      top: 100,
      radius: 50,
      fill: "transparent",
      opacity: 1,
      stroke: "#000",
      strokeWidth: 3,
    });

    fabricCanvasRef.current.add(circle);
    fabricCanvasRef.current.setActiveObject(circle);
    fabricCanvasRef.current.renderAll();
  };

  const addArrow = (): void => {
    if (!fabricCanvasRef.current) return;

    // Create the arrow head path
    const deltaX = 100;
    const deltaY = 0;
    const headLength = 20;
    const headAngle = Math.PI / 6; // 30 degrees

    // Calculate arrow head points
    const angle = Math.atan2(deltaY, deltaX);
    const x2 = deltaX;
    const y2 = deltaY;

    // Calculate the points for the arrow head
    const x3 = x2 - headLength * Math.cos(angle - headAngle);
    const y3 = y2 - headLength * Math.sin(angle - headAngle);
    const x4 = x2 - headLength * Math.cos(angle + headAngle);
    const y4 = y2 - headLength * Math.sin(angle + headAngle);

    // Create path string for arrow
    const pathString = `M 0 0 L ${x2} ${y2} M ${x2} ${y2} L ${x3} ${y3} M ${x2} ${y2} L ${x4} ${y4}`;

    const arrow = new fabric.Path(pathString, {
      left: 100,
      top: 100,
      fill: "transparent",
      stroke: "#000000",
      strokeWidth: 3,
      strokeLineCap: "round",
      strokeLineJoin: "round",
    });

    fabricCanvasRef.current.add(arrow);
    fabricCanvasRef.current.setActiveObject(arrow);
    fabricCanvasRef.current.renderAll();
  };

  const addText = (): void => {
    if (!fabricCanvasRef.current || !textInput.trim()) return;

    const text = new fabric.Text(textInput, {
      left: 100,
      top: 100,
      fontSize: 24,
      fontFamily: "Arial",
      fill: "#1f2937",
      editable: true,
    });

    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    fabricCanvasRef.current.renderAll();
    setTextInput("");
  };

  const addIconPin = (): void => {
    const img = new Image();
    img.src = "pin.png";

    img.onload = () => {
      const fabricImage = new fabric.Image(img, {
        left: 100,
        top: 100,
        scaleX: 0.1, // scale down to 20% of original size
        scaleY: 0.1,
        originX: "center",
        originY: "center",
      });

      fabricCanvasRef.current?.add(fabricImage);
      fabricCanvasRef.current?.renderAll();
    };
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      addText();
    }
  };

  const formatText = (style: "bold" | "italic" | "underline"): void => {
    if (!fabricCanvasRef.current) return;

    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (!activeObject || !(activeObject instanceof fabric.Text)) return;

    switch (style) {
      case "bold":
        activeObject.set(
          "fontWeight",
          activeObject.fontWeight === "bold" ? "normal" : "bold"
        );
        break;
      case "italic":
        activeObject.set(
          "fontStyle",
          activeObject.fontStyle === "italic" ? "normal" : "italic"
        );
        break;
      case "underline":
        activeObject.set("underline", !activeObject.underline);
        break;
    }

    fabricCanvasRef.current.renderAll();
  };

  // const clearCanvas = () => {
  //   if (!fabricCanvasRef.current) return;

  //   fabricCanvasRef.current.clear();
  //   fabricCanvasRef.current.backgroundColor = "#f0f0f0"; // or whatever your default background is

  //   // Reset the viewport transform
  //   if (fabricCanvasRef.current.viewportTransform) {
  //     fabricCanvasRef.current.viewportTransform[4] = 0;
  //     fabricCanvasRef.current.viewportTransform[5] = 0;
  //   }

  //   fabricCanvasRef.current.renderAll();
  // };

  const handleLineWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setLineWidth(value);
    if (fabricCanvasRef.current?.freeDrawingBrush) {
      fabricCanvasRef.current.freeDrawingBrush.width = value;
    }
  };

  const handleShadowWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setShadowWidth(value);
    if (fabricCanvasRef.current?.freeDrawingBrush?.shadow) {
      (fabricCanvasRef.current.freeDrawingBrush.shadow as Shadow).blur = value;
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (fabricCanvasRef.current?.freeDrawingBrush) {
      fabricCanvasRef.current.freeDrawingBrush.color = e.target.value;
    }
  };

  const handleShadowColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (fabricCanvasRef.current?.freeDrawingBrush?.shadow) {
      (fabricCanvasRef.current.freeDrawingBrush.shadow as Shadow).color =
        e.target.value;
    }
  };

  // Add new function to export canvas as JSON
  const exportToJSON = () => {
    if (!fabricCanvasRef.current) return;

    const json = fabricCanvasRef.current.toJSON();
    const jsonStr = JSON.stringify(json);

    // Create blob and download
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "canvas-drawing.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Add function to import JSON
  const importFromJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!fabricCanvasRef.current || !e.target.files) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      if (!event.target?.result || !fabricCanvasRef.current) return;

      try {
        // Clear the canvas first
        fabricCanvasRef.current.clear();

        const jsonData = JSON.parse(event.target.result as string);

        // Load the JSON data with a callback to ensure everything is rendered
        fabricCanvasRef.current.loadFromJSON(jsonData, () => {
          // After loading, make sure to:
          fabricCanvasRef.current?.setZoom(1); // Reset zoom
          fabricCanvasRef.current?.renderAll(); // Re-render everything

          // Reset the viewport
          if (fabricCanvasRef.current?.viewportTransform) {
            fabricCanvasRef.current.viewportTransform[4] = 0;
            fabricCanvasRef.current.viewportTransform[5] = 0;
          }

          // Update drawing mode and brush if needed
          if (fabricCanvasRef.current?.isDrawingMode) {
            const brush = fabricCanvasRef.current.freeDrawingBrush;
            if (brush) {
              brush.width = lineWidth;
              brush.color = brush.color || "#000000";
              if (brush.shadow) {
                brush.shadow.blur = shadowWidth;
                brush.shadow.offsetX = shadowOffset;
                brush.shadow.offsetY = shadowOffset;
              }
            }
          }
        });
        setLoadImport(true);
      } catch (error) {
        console.error("Error loading JSON:", error);
        alert(
          "Error loading file. Please make sure it's a valid canvas JSON file."
        );
      }
    };

    reader.readAsText(file);
    // Reset the input value to allow loading the same file again
    e.target.value = "";
  };

  // Add function to export as image
  const exportToImage = () => {
    if (!fabricCanvasRef.current) return;

    const dataURL = fabricCanvasRef.current.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 1,
    });

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "canvas-drawing.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenAddText = () => {
    setOpenAddText(!openAddText);
  };

  //=========== Handle bookmarking ===========//
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

  const handleJumpToPage = (pageNumber: number) => {
    if (!pdfDocument || pageNumber < 1 || pageNumber > numPages!) return;

    setCurrentPage(pageNumber);
    renderPdfPage(pageNumber, pdfDocument);
  };

  // Add a resize handler if you want the canvas to be responsive
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !fabricCanvasRef.current) return;

      const container = canvasRef.current.parentElement;
      if (!container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      fabricCanvasRef.current.setDimensions({
        width: width,
        height: height,
      });
      fabricCanvasRef.current.renderAll();
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial resize

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (loadImport) {
      fabricCanvasRef?.current?.renderAll();
      setLoadImport(false);
    }
  }, [loadImport]);

  return (
    <div className="p-4">
      <div className="mb-4 space-y-4">
        {/* Upload file control */}
        <div className="space-y-4 bg-gray-100 p-4 rounded-lg">
          <div className="flex gap-2 items-center justify-between">
            <label className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 cursor-pointer">
              Upload PDF
              <input
                type="file"
                accept=".pdf"
                onChange={handlePdfUpload}
                className="hidden"
              />
            </label>

            {numPages && (
              <div className="flex items-center gap-2 text-black">
                <button
                  onClick={() => changePage(-1)}
                  disabled={currentPage <= 1}
                  className="p-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                >
                  <ChevronLeft size={20} />
                </button>

                <span className="text-sm">
                  Page {currentPage} of {numPages}
                </span>

                <button
                  onClick={() => changePage(1)}
                  disabled={currentPage >= (numPages || 0)}
                  className="p-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                >
                  <ChevronRight size={20} />
                </button>

                <div className="flex items-center gap-2 ml-4">
                  <label className="text-sm">Zoom:</label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={pdfScale}
                    onChange={(e) => {
                      setPdfScale(parseFloat(e.target.value));
                    }}
                    className="w-32"
                  />
                  <span className="text-sm">
                    {(pdfScale * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

            {/* Export/Import Controls */}
            <div className="flex gap-2">
              <button
                onClick={exportToJSON}
                className="px-4 py-2 text-white bg-gray-500 rounded-lg hover:bg-gray-600 flex items-center gap-2"
                title="Export as JSON"
              >
                <Save size={20} />
                Export
              </button>

              <label className="px-4 py-2 text-white bg-gray-500 rounded-lg hover:bg-gray-600 cursor-pointer flex items-center gap-2">
                <Upload size={20} />
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={importFromJSON}
                  className="hidden"
                />
              </label>

              <button
                onClick={exportToImage}
                className="px-4 py-2 text-white bg-gray-500 rounded-lg hover:bg-gray-600 flex items-center gap-2"
                title="Export as PNG"
              >
                <Download size={20} />
                PNG
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-gray-200 p-4 rounded-lg">
          <div className="flex gap-2">
            <button
              className="bg-white hover:bg-gray-400 text-black font-bold p-2  rounded-lg"
              onClick={handleOpenAddText}
              type="button"
            >
              <Type size={25} />
            </button>
            <button
              className="bg-white hover:bg-gray-400 text-black font-bold p-2  rounded-lg"
              onClick={addRectangle}
              type="button"
            >
              <Square size={25} />
            </button>
            <button
              className="bg-white hover:bg-gray-400 text-black font-bold p-2  rounded-lg"
              onClick={addCircle}
              type="button"
            >
              <Circle size={25} />
            </button>
            <button
              className="bg-white hover:bg-gray-400 text-black font-bold p-2  rounded-lg"
              onClick={addArrow}
              type="button"
            >
              <MoveRight size={25} />
            </button>
            <button
              className="bg-white hover:bg-gray-400 text-black font-bold p-2  rounded-lg"
              onClick={addIconPin}
              type="button"
            >
              <Pin size={25} />
            </button>
            <button
              onClick={toggleDrawingMode}
              className=" p-2 text-black bg-white hover:bg-gray-400 rounded-lg hover:bg-white-600"
            >
              {isDrawingMode ? <PenLine size={25} /> : <Pen size={25} />}
            </button>
            {/* <button
              onClick={clearCanvas}
              className=" p-2 text-white bg-red-400 rounded-lg hover:bg-red-600"
            >
              <Trash2 size={25} />
            </button> */}
          </div>
          {isDrawingMode && (
            <div className="space-y-3 text-black">
              <div className="flex items-center gap-2">
                <label className="font-medium">Mode:</label>
                <select
                  onChange={handleModeChange}
                  className="px-3 py-1 border rounded"
                >
                  <option value="Pencil">Pencil</option>
                  <option value="Circle">Circle</option>
                  <option value="Spray">Spray</option>
                  <option value="Pattern">Pattern</option>
                  <option value="hline">hline</option>
                  <option value="vline">vline</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="font-medium">
                  Line width: <span>{lineWidth}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="150"
                  value={lineWidth}
                  onChange={handleLineWidthChange}
                  className="w-48"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="font-medium">Line color:</label>
                <input
                  type="color"
                  onChange={handleColorChange}
                  className="w-8 h-8"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="font-medium">Shadow color:</label>
                <input
                  type="color"
                  onChange={handleShadowColorChange}
                  className="w-8 h-8"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="font-medium">
                  Shadow width: <span>{shadowWidth}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={shadowWidth}
                  onChange={handleShadowWidthChange}
                  className="w-48"
                />
              </div>
            </div>
          )}

          {openAddText && (
            <>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter text here..."
                  className="flex-1 px-4 py-2 border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  className="bg-gray-700 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"
                  onClick={addText}
                  type="button"
                >
                  Add Text
                </button>
              </div>

              <div className="flex space-x-2">
                <button
                  className="bg-gray-700 hover:bg-gray-900 text-white font-bold p-2 rounded-lg"
                  onClick={() => formatText("bold")}
                  type="button"
                >
                  <Bold size={25} />
                </button>
                <button
                  className="bg-gray-700 hover:bg-gray-900 text-white font-bold p-2 rounded-lg"
                  onClick={() => formatText("italic")}
                  type="button"
                >
                  <Italic size={25} />
                </button>
                <button
                  className="bg-gray-700 hover:bg-gray-900 text-white font-bold p-2 rounded-lg"
                  onClick={() => formatText("underline")}
                  type="button"
                >
                  <Underline size={25} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="relative w-full flex justify-center">
        <div className="md:w-1/4 pr-1">
          <BookmarkSidebar
            bookmarks={bookmarks}
            onJumpToPage={handleJumpToPage}
            onAddBookmark={handleAddBookmark}
          />
        </div>
        <canvas ref={canvasRef} onContextMenu={(e) => e.preventDefault()} />
        {/* Selection Controls */}
        {isObjectSelected && (
          <div className="absolute top-1 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl p-1 flex gap-2">
            <button
              onClick={deleteSelectedObject}
              className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
              title="Delete selected object (Delete)"
            >
              <Trash2 size={20} />
            </button>
          </div>
        )}
        <div className="md:w-1/4 pl-1">
          <AnnotationSidebar />
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>Click and drag to move objects</p>
        <p>Use corner handles to resize</p>
        <p>Use the circular handle to rotate</p>
        <p>Double-click text to edit directly on canvas</p>
      </div>
    </div>
  );
};

export default CanvasApp;
