import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getMechanicPage } from '@/lib/supabase';
import { initials, ratingStars } from '@/lib/format';

// The link preview. This is the shock factor: when a mechanic drops his link
// in a Facebook group or a text, this card is what everyone sees.

export const alt = 'Mechanic profile on Myku Auto';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function fonts() {
  const [extraBold, medium] = await Promise.all([
    readFile(join(process.cwd(), 'assets/fonts/Jakarta-ExtraBold.ttf')),
    readFile(join(process.cwd(), 'assets/fonts/Jakarta-Medium.ttf')),
  ]);
  return [
    { name: 'Jakarta', data: extraBold, weight: 800 as const, style: 'normal' as const },
    { name: 'Jakarta', data: medium, weight: 500 as const, style: 'normal' as const },
  ];
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getMechanicPage(slug);
  const fontList = await fonts();

  if (!page) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0a0a',
            color: '#f97316',
            fontFamily: 'Jakarta',
            fontSize: 96,
            fontWeight: 800,
          }}
        >
          Myku Auto
        </div>
      ),
      { ...size, fonts: fontList }
    );
  }

  const ratingNum =
    typeof page.rating === 'string' ? parseFloat(page.rating) : page.rating ?? 0;
  const hasRating = (page.review_count ?? 0) > 0 && ratingNum > 0;
  const city = page.service_city?.split(',')[0]?.trim();
  const facts = [
    page.id_verified ? 'ID verified' : null,
    page.has_insurance ? 'Insured' : null,
    (page.years_experience ?? 0) > 0 ? `${page.years_experience} yrs experience` : null,
  ].filter(Boolean) as string[];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#0a0a0a',
          backgroundImage:
            'radial-gradient(ellipse 80% 55% at 50% -10%, rgba(249,115,22,0.22), rgba(10,10,10,0))',
          fontFamily: 'Jakarta',
          padding: '64px 72px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 56 }}>
          {page.photo_url ? (
            <div
              style={{
                display: 'flex',
                width: 260,
                height: 260,
                borderRadius: 48,
                overflow: 'hidden',
                border: '3px solid rgba(249,115,22,0.45)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.photo_url}
                alt=""
                width={260}
                height={260}
                style={{ objectFit: 'cover', width: 260, height: 260 }}
              />
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 260,
                height: 260,
                borderRadius: 48,
                background: 'linear-gradient(150deg, #ffb877, #f97316)',
                color: '#180a02',
                fontSize: 110,
                fontWeight: 800,
              }}
            >
              {initials(page.full_name)}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                color: '#fff',
                fontSize: page.full_name.length > 18 ? 62 : 76,
                fontWeight: 800,
                letterSpacing: -3,
                lineHeight: 1.05,
              }}
            >
              {page.full_name}
            </div>
            {page.specialization ? (
              <div
                style={{
                  display: 'flex',
                  color: '#dcdad6',
                  fontSize: 32,
                  fontWeight: 500,
                  marginTop: 16,
                }}
              >
                {page.specialization}
              </div>
            ) : null}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                marginTop: 18,
                fontSize: 28,
              }}
            >
              {hasRating ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#ffb877', fontWeight: 800 }}>
                    {ratingStars(ratingNum)}
                  </span>
                  <span style={{ color: '#fff', fontWeight: 800 }}>
                    {ratingNum.toFixed(1)}
                  </span>
                  <span style={{ color: '#a49f97', fontWeight: 500 }}>
                    ({page.review_count})
                  </span>
                </div>
              ) : null}
              {city ? (
                <span style={{ color: '#a49f97', fontWeight: 500 }}>{city}</span>
              ) : null}
            </div>
            {facts.length > 0 ? (
              <div style={{ display: 'flex', gap: 14, marginTop: 26 }}>
                {facts.map((f) => (
                  <div
                    key={f}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: '#7af0e0',
                      background: 'rgba(45,212,191,0.12)',
                      border: '2px solid rgba(45,212,191,0.30)',
                      borderRadius: 999,
                      padding: '10px 22px',
                      fontSize: 24,
                      fontWeight: 500,
                    }}
                  >
                    {f}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '2px solid #232427',
            paddingTop: 28,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 34, fontWeight: 800 }}>
            <span style={{ color: '#f97316' }}>Myku</span>
            <span style={{ color: '#fff', marginLeft: 12 }}>Auto</span>
          </div>
          <div style={{ display: 'flex', color: '#a49f97', fontSize: 28, fontWeight: 500 }}>
            trymyku.com/{page.slug}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fontList }
  );
}
