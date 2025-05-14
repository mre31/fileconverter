import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import JSZip from 'jszip';
import pngToIco from 'png-to-ico';

// Helper to generate a filename based on original and target format
function generateOutputFileName(originalName: string, targetFormat: string, isZip: boolean = false): string {
  const nameWithoutExtension = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
  if (isZip) { 
    return `${nameWithoutExtension}-icons.zip`;
  }
  return `${nameWithoutExtension}.${targetFormat.toLowerCase()}`;
}

export async function POST(request: NextRequest) {
  console.log('Received request to /api/convert');

  try {
    const data = await request.formData();
    const file = data.get('file') as File | null;
    const targetFormat = data.get('targetFormat') as string | null;
    const qualityString = data.get('quality') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    if (!targetFormat) {
      return NextResponse.json({ error: 'No target format provided.' }, { status: 400 });
    }

    console.log('File name:', file.name);
    console.log('Target format:', targetFormat);
    if (qualityString) console.log('Requested quality:', qualityString);

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    let outputBuffer: Buffer;
    let outputMimeType: string;
    let outputFileName: string;

    const lowerTargetFormat = targetFormat.toLowerCase();

    switch (lowerTargetFormat) {
      case 'ico':
        const icoSizes = [16, 24, 32, 48, 64, 128, 256]; 
        const zip = new JSZip();
        let icoFilesGenerated = 0;

        for (const size of icoSizes) {
          try {
            const pngBuffer = await sharp(fileBuffer)
              .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
              .png()
              .toBuffer();
            
            // Create an individual .ico file for this size
            const icoBuffer = await pngToIco([pngBuffer]); 
            zip.file(`icon-${size}x${size}.ico`, icoBuffer); // Add .ico file to zip
            icoFilesGenerated++;
          } catch (conversionError) {
            console.warn(`Failed to generate ${size}x${size} .ico file:`, conversionError);
          }
        }
        
        if (icoFilesGenerated === 0) { 
             return NextResponse.json({ error: 'Failed to generate any .ico files for the ZIP.'}, { status: 500 });
        }

        outputBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
        outputMimeType = 'application/zip';
        outputFileName = generateOutputFileName(file.name, 'ico', true);
        break;

      case 'svg':
        // If the original file is SVG and target is SVG, pass it through.
        // Sharp is not for direct SVG to SVG (it rasterizes first).
        if (file.type === 'image/svg+xml') {
          outputBuffer = fileBuffer;
          outputMimeType = 'image/svg+xml';
          outputFileName = generateOutputFileName(file.name, 'svg');
        } else {
          // Converting raster to SVG is complex and not well-supported by Sharp for vectorization.
          return NextResponse.json({ error: 'Conversion from raster to SVG is not supported by this server.' }, { status: 400 });
        }
        break;

      case 'png':
      case 'jpeg':
      case 'jpg': // Alias for jpeg
      case 'webp':
      case 'avif':
        outputMimeType = `image/${lowerTargetFormat === 'jpg' ? 'jpeg' : lowerTargetFormat}`;
        outputFileName = generateOutputFileName(file.name, lowerTargetFormat);
        
        const options: sharp.OutputOptions | sharp.JpegOptions | sharp.PngOptions | sharp.WebpOptions | sharp.AvifOptions = {};
        if (qualityString) {
          const parsedQualityFloat = parseFloat(qualityString);
          if (!isNaN(parsedQualityFloat)) {
            const qualityInt = Math.round(parsedQualityFloat * 100);
            if (lowerTargetFormat === 'jpeg' || lowerTargetFormat === 'webp' || lowerTargetFormat === 'avif') {
              const specificOptions = options as sharp.JpegOptions | sharp.WebpOptions | sharp.AvifOptions;
              specificOptions.quality = Math.max(1, Math.min(100, qualityInt));
              console.log(`Applying quality ${specificOptions.quality} for ${lowerTargetFormat}`);
            }
          } else {
            console.warn(`Failed to parse quality string: ${qualityString}`);
          }
        } else if (lowerTargetFormat === 'jpeg' || lowerTargetFormat === 'webp' || lowerTargetFormat === 'avif') {
          // Apply a default quality if not specified, for formats that support it
          const specificOptions = options as sharp.JpegOptions | sharp.WebpOptions | sharp.AvifOptions;
          specificOptions.quality = 92; // Default to 92 if not provided
          console.log(`No quality provided, defaulting to ${specificOptions.quality} for ${lowerTargetFormat}`);
        }

        try {
            if (lowerTargetFormat === 'jpg') { // sharp uses 'jpeg'
                outputBuffer = await sharp(fileBuffer).jpeg(options as sharp.JpegOptions).toBuffer();
            } else {
                 // Asserting lowerTargetFormat to a more specific type that sharp.toFormat accepts as first arg
                outputBuffer = await sharp(fileBuffer).toFormat(lowerTargetFormat as keyof sharp.FormatEnum, options).toBuffer();
            }
        } catch (formatError) {
            console.error(`Sharp formatting error for ${lowerTargetFormat}:`, formatError);
            return NextResponse.json({ error: `Server error converting to ${lowerTargetFormat}` }, { status: 500 });
        }
        break;

      default:
        return NextResponse.json({ error: `Unsupported target format: ${targetFormat}` }, { status: 400 });
    }

    if (!outputBuffer) { 
        return NextResponse.json({ error: 'Failed to generate output buffer.'}, {status: 500 });
    }

    console.log(`Outputting as ${outputMimeType}, filename: ${outputFileName}, size: ${outputBuffer.length} bytes`);

    const headers = new Headers();
    headers.set('Content-Type', outputMimeType);
    headers.set('Content-Disposition', `attachment; filename="${outputFileName}"`);

    return new NextResponse(outputBuffer, {
      status: 200,
      statusText: 'OK',
      headers,
    });

  } catch (error: unknown) {
    console.error('Error processing /api/convert:', error);
    let errorMessage = 'Error processing file with Sharp.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 