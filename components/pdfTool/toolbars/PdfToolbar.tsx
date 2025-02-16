"use client";

import { AnnotationType, ANNOTATION_BUTTONS } from "@/types/annotations";
import {
  CaretLeft,
  CaretRight,
  Circle,
  DownloadSimple,
  ExclamationMark,
  Highlighter,
  Note,
  NotePencil,
  Pentagon,
  Scissors,
  Square,
  TextAUnderline,
  TrashSimple,
} from "@phosphor-icons/react";

interface PdfToolbarProps {
  selectedTool: AnnotationType | null;
  onSelectTool: (tool: AnnotationType | null) => void;
  onDownload: () => void;
  onClearAnno: () => void;
  currentPage: number;
  numPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

const PdfToolbar = ({
  selectedTool,
  onSelectTool,
  onDownload,
  onClearAnno,
  currentPage,
  numPages,
  onPreviousPage,
  onNextPage,
}: PdfToolbarProps) => {
  const renderIcon = (type: string) => {
    switch (type) {
      case "text":
        return <Note size={18} />;
      case "highlight":
        return <Highlighter size={18} />;
      case "underline":
        return <TextAUnderline size={18} />;
      case "square":
        return <Square size={18} />;
      case "circle":
        return <Circle size={18} />;
      case "freetext":
        return <NotePencil size={18} />;
      case "strikeout":
        return <Scissors size={18} />;
      case "polygon":
        return <Pentagon size={18} />;
      default:
        return <ExclamationMark size={18} />;
    }
  };
  return (
    <div className="flex justify-between flex-wrap gap-2 p-1 bg-white border border-gray-500 rounded-lg shadow-sm">
      <div className="flex items-center gap-2">
        <button
          onClick={onPreviousPage}
          disabled={currentPage <= 1}
          className="px-2 py-2 text-black rounded disabled:bg-gray-300"
        >
          <CaretLeft size={20} />
        </button>
        <div className="text-sm text-black border p-2 px-4 rounded-lg bg-gray-200">
          {currentPage} / {numPages}
        </div>
        <button
          onClick={onNextPage}
          disabled={currentPage >= numPages}
          className="px-2 py-2 text-black rounded disabled:bg-gray-300"
        >
          <CaretRight size={20} />
        </button>
      </div>
      <div className="flex gap-2">
        {ANNOTATION_BUTTONS.map((button) => (
          <button
            key={button.type}
            onClick={() =>
              onSelectTool(selectedTool === button.type ? null : button.type)
            }
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors
            ${
              selectedTool === button.type
                ? "bg-gray-200 text-black"
                : "bg-white text-black hover:bg-gray-200 hover:text-black"
            }`}
            title={button.label}
          >
            {renderIcon(button.type)}
            {/* <span className="text-sm">{button.label}</span> */}
          </button>
        ))}
        <div className="flex items-center gap-2">
          <input
            type="color"
            // value={color}
            // onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer"
          />
          <input
            type="range"
            min="1"
            max="10"
            // value={thickness}
            // onChange={(e) => setThickness(Number(e.target.value))}
            className="w-24"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onDownload}
          // disabled={!pdfDoc}
          className="p-2 text-black rounded-lg hover:bg-gray-100 
                                 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <DownloadSimple size={20} />
        </button>
        <button
          onClick={onClearAnno}
          // disabled={!pdfDoc}
          className="p-2 text-red-600 hover:text-red-700 rounded-lg hover:bg-gray-100
                                 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <TrashSimple size={20} />
        </button>
      </div>
    </div>
  );
};

export default PdfToolbar;
