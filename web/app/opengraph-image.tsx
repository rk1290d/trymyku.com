import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Site-wide link preview: a real large card instead of a tiny logo thumbnail.

export const alt = 'Myku Auto | The first place you go for car trouble';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const [extraBold, medium] = await Promise.all([
    readFile(join(process.cwd(), 'assets/fonts/Jakarta-ExtraBold.ttf')),
    readFile(join(process.cwd(), 'assets/fonts/Jakarta-Medium.ttf')),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: '#0a0a0a',
          backgroundImage:
            'radial-gradient(ellipse 80% 55% at 50% -10%, rgba(249,115,22,0.25), rgba(10,10,10,0))',
          fontFamily: 'Jakarta',
          padding: '0 90px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 44, fontWeight: 800 }}>
          <span style={{ color: '#f97316' }}>Myku</span>
          <span style={{ color: '#fff', marginLeft: 14 }}>Auto</span>
        </div>
        <div
          style={{
            display: 'flex',
            color: '#fff',
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1.06,
            marginTop: 34,
          }}
        >
          Something wrong with your car?
        </div>
        <div
          style={{
            display: 'flex',
            color: '#f97316',
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1.06,
          }}
        >
          Open Myku.
        </div>
        <div
          style={{
            display: 'flex',
            color: '#a49f97',
            fontSize: 32,
            fontWeight: 500,
            marginTop: 30,
          }}
        >
          Independent, verified mechanics quote. You choose. trymyku.com
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Jakarta', data: extraBold, weight: 800, style: 'normal' },
        { name: 'Jakarta', data: medium, weight: 500, style: 'normal' },
      ],
    }
  );
}
