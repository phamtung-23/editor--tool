"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';

interface Shadow {
  blur: number;
  offsetX: number;
  offsetY: number;
  affectStroke: boolean;
  color: string;
}

interface DrawingControlsProps {
  initialLineWidth?: number;
  initialShadowWidth?: number;
  initialShadowOffset?: number;
}

const DrawingControls: React.FC<DrawingControlsProps> = ({
  initialLineWidth = 30,
  initialShadowWidth = 0,
  initialShadowOffset = 0,
}) => {
  const [lineWidth, setLineWidth] = useState<number>(initialLineWidth);
  const [shadowWidth, setShadowWidth] = useState<number>(initialShadowWidth);
  const [shadowOffset, setShadowOffset] = useState<number>(initialShadowOffset);
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasInstanceRef = useRef<fabric.Canvas | null>(null);

  const initializePatternBrushes = (canvas: fabric.Canvas) => {
    // vLine pattern brush
    const vLinePatternBrush = new fabric.PatternBrush(canvas);
    vLinePatternBrush.getPatternSrc = function(this: fabric.PatternBrush) {
      const patternCanvas = document.createElement('canvas');
      patternCanvas.width = patternCanvas.height = 10;
      const ctx = patternCanvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = this.color || '';
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
    hLinePatternBrush.getPatternSrc = function(this: fabric.PatternBrush) {
      const patternCanvas = document.createElement('canvas');
      patternCanvas.width = patternCanvas.height = 10;
      const ctx = patternCanvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = this.color || '';
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

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize canvas
    canvasInstanceRef.current = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
    });

    const canvas = canvasInstanceRef.current;
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    fabric.Object.prototype.transparentCorners = false;

    // Initialize pattern brushes
    if (fabric.PatternBrush) {
      initializePatternBrushes(canvas);
    }

    // Initial brush settings
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = lineWidth;
      canvas.freeDrawingBrush.shadow = new fabric.Shadow({
        blur: shadowWidth,
        offsetX: 0,
        offsetY: 0,
        affectStroke: true,
        color: '#000000',
      });
    }

    return () => {
      canvas.dispose();
    };
  }, []);

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const canvas = canvasInstanceRef.current;
    if (!canvas) return;

    const value = e.target.value;

    if (value === 'hline') {
      canvas.freeDrawingBrush = (canvas as any).vLinePatternBrush;
    } else if (value === 'vline') {
      canvas.freeDrawingBrush = (canvas as any).hLinePatternBrush;
    } else {
      canvas.freeDrawingBrush = new (fabric as any)[value + 'Brush'](canvas);
    }

    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = lineWidth;
      canvas.freeDrawingBrush.shadow = new fabric.Shadow({
        blur: shadowWidth,
        offsetX: shadowOffset,
        offsetY: shadowOffset,
        affectStroke: true,
        color: '#000000',
      });
    }
  };

  const toggleDrawingMode = () => {
    const canvas = canvasInstanceRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = !canvas.isDrawingMode;
    setIsDrawingMode(canvas.isDrawingMode);
  };

  const clearCanvas = () => {
    canvasInstanceRef.current?.clear();
  };

  const handleLineWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setLineWidth(value);
    if (canvasInstanceRef.current?.freeDrawingBrush) {
      canvasInstanceRef.current.freeDrawingBrush.width = value;
    }
  };

  const handleShadowWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setShadowWidth(value);
    if (canvasInstanceRef.current?.freeDrawingBrush?.shadow) {
      (canvasInstanceRef.current.freeDrawingBrush.shadow as Shadow).blur = value;
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (canvasInstanceRef.current?.freeDrawingBrush) {
      canvasInstanceRef.current.freeDrawingBrush.color = e.target.value;
    }
  };

  const handleShadowColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (canvasInstanceRef.current?.freeDrawingBrush?.shadow) {
      (canvasInstanceRef.current.freeDrawingBrush.shadow as Shadow).color = e.target.value;
    }
  };

  return (
    <div className="p-4">
      <canvas ref={canvasRef} className="border border-gray-300 w-full h-96 mb-4" />
      
      <div className="space-y-4 bg-gray-500 p-4 rounded-lg">
        <div className="flex gap-2">
          <button 
            onClick={toggleDrawingMode}
            className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            {isDrawingMode ? 'Cancel drawing mode' : 'Enter drawing mode'}
          </button>
          <button 
            onClick={clearCanvas}
            className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            Clear
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="font-medium">Mode:</label>
            <select 
              onChange={handleModeChange}
              className="px-3 py-1 border rounded bg-white"
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
      </div>
    </div>
  );
};

export default DrawingControls;