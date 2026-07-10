import React, { useEffect, useMemo, useState } from 'react';
import { Download, Image as ImageIcon, Info, Lock, SlidersHorizontal, Unlock, Upload } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const formatBytes = (bytes) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const blobFromCanvas = (canvas, type, quality) => (
  new Promise((resolve) => canvas.toBlob(resolve, type, quality))
);

const OUTPUT_FORMATS = [
  { value: 'jpg', label: 'JPG', mime: 'image/jpeg', extension: 'jpg' },
  { value: 'jpeg', label: 'JPEG', mime: 'image/jpeg', extension: 'jpeg' },
  { value: 'png', label: 'PNG', mime: 'image/png', extension: 'png' },
  { value: 'webp', label: 'WebP', mime: 'image/webp', extension: 'webp' },
];

const applyJpegDpi = async (blob, dpi) => {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  for (let index = 2; index < bytes.length - 16;) {
    if (bytes[index] !== 0xff) break;
    const marker = bytes[index + 1];
    const length = view.getUint16(index + 2);
    const isJfif = marker === 0xe0
      && bytes[index + 4] === 0x4a
      && bytes[index + 5] === 0x46
      && bytes[index + 6] === 0x49
      && bytes[index + 7] === 0x46
      && bytes[index + 8] === 0x00;

    if (isJfif) {
      bytes[index + 11] = 1;
      view.setUint16(index + 12, dpi);
      view.setUint16(index + 14, dpi);
      return new Blob([bytes], { type: 'image/jpeg' });
    }

    index += 2 + length;
  }

  return blob;
};

const loadImage = (file) => (
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };
    image.src = url;
  })
);

const drawToCanvas = (image, width, height, outputType) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext('2d');

  if (outputType === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
};

const compressImage = async (file, settings) => {
  const image = await loadImage(file);
  const targetBytes = settings.targetKb * 1024;
  const maxQuality = settings.quality / 100;
  let width = settings.width || image.naturalWidth;
  let height = settings.height || image.naturalHeight;
  let best = null;

  for (let pass = 0; pass < 12; pass += 1) {
    const canvas = drawToCanvas(image, width, height, settings.outputType);
    let low = 0.08;
    let high = Math.max(0.08, maxQuality);

    for (let i = 0; i < 8; i += 1) {
      const quality = (low + high) / 2;
      const blob = await blobFromCanvas(canvas, settings.outputType, quality);
      if (!blob) throw new Error('Could not compress image');

      if (!best || Math.abs(blob.size - targetBytes) < Math.abs(best.blob.size - targetBytes) || blob.size <= targetBytes) {
        best = { blob, quality, width: canvas.width, height: canvas.height };
      }

      if (blob.size > targetBytes) high = quality;
      else low = quality;
    }

    if (best?.blob.size <= targetBytes || Math.min(width, height) <= 64) break;
    width *= 0.9;
    height *= 0.9;
  }

  if (best && settings.outputType === 'image/jpeg') {
    best.blob = await applyJpegDpi(best.blob, settings.dpi);
  }

  return best ? { ...best, dpi: settings.dpi } : best;
};

const ImageReducerPage = ({ theme, toggleTheme }) => {
  const [file, setFile] = useState(null);
  const [targetKb, setTargetKb] = useState(250);
  const [outputFormat, setOutputFormat] = useState('jpg');
  const [dpi, setDpi] = useState(300);
  const [quality, setQuality] = useState(85);
  const [dimensions, setDimensions] = useState({ width: '', height: '' });
  const [originalDimensions, setOriginalDimensions] = useState(null);
  const [lockAspect, setLockAspect] = useState(true);
  const [previewUrl, setPreviewUrl] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedOutput = useMemo(() => (
    OUTPUT_FORMATS.find(format => format.value === outputFormat) || OUTPUT_FORMATS[0]
  ), [outputFormat]);

  useEffect(() => {
    if (!result?.blob) {
      setPreviewUrl('');
      return undefined;
    }

    const url = URL.createObjectURL(result.blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [result]);

  const handleFileChange = async (nextFile) => {
    setFile(nextFile);
    setResult(null);
    setPreviewUrl('');
    setError('');

    if (!nextFile) {
      setDimensions({ width: '', height: '' });
      setOriginalDimensions(null);
      return;
    }

    try {
      const image = await loadImage(nextFile);
      const nextDimensions = { width: image.naturalWidth, height: image.naturalHeight };
      setOriginalDimensions(nextDimensions);
      setDimensions(nextDimensions);
    } catch {
      setError('Could not read image dimensions.');
    }
  };

  const updateDimension = (key, value) => {
    const numericValue = Math.max(1, Number(value) || '');
    const next = { ...dimensions, [key]: numericValue };

    if (lockAspect && originalDimensions && numericValue) {
      const ratio = originalDimensions.width / originalDimensions.height;
      if (key === 'width') next.height = Math.max(1, Math.round(numericValue / ratio));
      if (key === 'height') next.width = Math.max(1, Math.round(numericValue * ratio));
    }

    setDimensions(next);
    setResult(null);
  };

  const handleReduce = async () => {
    if (!file) {
      setError('Please choose an image first.');
      return;
    }

    setError('');
    setResult(null);
    setPreviewUrl('');
    setIsProcessing(true);

    try {
      const compressed = await compressImage(file, {
        targetKb: Number(targetKb),
        outputType: selectedOutput.mime,
        dpi: Number(dpi),
        quality: Number(quality),
        width: Number(dimensions.width),
        height: Number(dimensions.height),
      });
      setResult(compressed);
    } catch (err) {
      setError(err.message || 'Compression failed. Try another image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result?.blob) return;
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'reduced-image';
    link.href = url;
    link.download = `${baseName}-reduced.${selectedOutput.extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container reducer-page">
      <Navbar onHome={() => {}} theme={theme} toggleTheme={toggleTheme} hideEditorControls={true} />

      <main className="reducer-shell">
        <section className="reducer-workspace">
          <div className="reducer-heading">
            <div>
              <p>Image Size Reducer</p>
              <h1>Reduce or increase image KB and DP</h1>
            </div>
            <ImageIcon size={34} />
          </div>

          <div className="reducer-grid">
            <div className="reducer-panel">
              <label className="reducer-upload">
                <Upload size={24} />
                <strong>{file ? file.name : 'Choose image'}</strong>
                <span>{file ? formatBytes(file.size) : 'JPG, PNG, WebP and other browser-supported images'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
                />
              </label>

              <div className="reducer-controls">
                <label>
                  <span>Target size</span>
                  <div className="kb-input">
                    <input
                      type="number"
                      min="10"
                      max="10000"
                      value={targetKb}
                      onChange={(event) => setTargetKb(event.target.value)}
                    />
                    <strong>KB</strong>
                  </div>
                </label>

                <label>
                  <span>Output</span>
                  <select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value)}>
                    {OUTPUT_FORMATS.map(format => (
                      <option key={format.value} value={format.value}>{format.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="dpi-control">
                <span>
                  DPI
                  <Info size={14} title="DPI is written into JPG metadata for print workflows." />
                </span>
                <select value={dpi} onChange={(event) => setDpi(event.target.value)}>
                  <option value="300">300 dpi</option>
                  <option value="200">200 dpi</option>
                  <option value="96">96 dpi</option>
                  <option value="72">72 dpi</option>
                </select>
              </label>

              <div className="dimension-controls">
                <div className="dimension-title">
                  <span>DP - Dimension Pixels</span>
                  <button type="button" onClick={() => setLockAspect(prev => !prev)}>
                    {lockAspect ? <Lock size={14} /> : <Unlock size={14} />}
                    <span>{lockAspect ? 'Locked' : 'Free'}</span>
                  </button>
                </div>
                <div className="dimension-row">
                  <label>
                    <span>Width DP</span>
                    <div className="kb-input">
                      <input
                        type="number"
                        min="1"
                        value={dimensions.width}
                        onChange={(event) => updateDimension('width', event.target.value)}
                      />
                      <strong>PX</strong>
                    </div>
                  </label>
                  <label>
                    <span>Height DP</span>
                    <div className="kb-input">
                      <input
                        type="number"
                        min="1"
                        value={dimensions.height}
                        onChange={(event) => updateDimension('height', event.target.value)}
                      />
                      <strong>PX</strong>
                    </div>
                  </label>
                </div>
                {originalDimensions && (
                  <button
                    type="button"
                    className="reducer-plain-btn"
                    onClick={() => {
                      setDimensions(originalDimensions);
                      setResult(null);
                    }}
                  >
                    Reset DP to {originalDimensions.width} x {originalDimensions.height}
                  </button>
                )}
              </div>

              <label className="quality-control">
                <div>
                  <span>Max quality</span>
                  <strong>{quality}%</strong>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={quality}
                  onChange={(event) => {
                    setQuality(event.target.value);
                    setResult(null);
                  }}
                />
              </label>

              <button className="btn-primary reducer-action" onClick={handleReduce} disabled={isProcessing}>
                <SlidersHorizontal size={18} />
                <span>{isProcessing ? 'Processing...' : 'Apply Size'}</span>
              </button>

              {error && <p className="reducer-error">{error}</p>}
            </div>

            <div className="reducer-panel reducer-result">
              {previewUrl && result?.blob ? (
                <>
                  <img src={previewUrl} alt="Reduced preview" />
                  <div className="reducer-stats">
                    <div>
                      <span>Original</span>
                      <strong>{formatBytes(file?.size)}</strong>
                    </div>
                    <div>
                      <span>Reduced</span>
                      <strong>{formatBytes(result.blob.size)}</strong>
                    </div>
                    <div>
                      <span>DP</span>
                      <strong>{result.width} x {result.height}</strong>
                    </div>
                    <div>
                      <span>Quality</span>
                      <strong>{Math.round(result.quality * 100)}%</strong>
                    </div>
                    <div>
                      <span>DPI</span>
                      <strong>{result.dpi} dpi</strong>
                    </div>
                  </div>
                  <button className="btn-primary reducer-action" onClick={handleDownload}>
                    <Download size={18} />
                    <span>Download</span>
                  </button>
                </>
              ) : (
                <div className="reducer-empty">
                  <ImageIcon size={44} />
                  <p>Your reduced image preview will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ImageReducerPage;
