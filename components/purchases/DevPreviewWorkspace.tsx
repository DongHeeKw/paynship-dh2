'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SiteShell from '@/components/site/SiteShell';
import PreviewModeLink from '@/components/site/PreviewModeLink';
import { createPreviewTransport } from '@/lib/dev-preview/transport';
import { previewHref } from '@/lib/dev-preview/navigation';
import { previewBookExample, readPreviewEntryDraft } from '@/lib/dev-preview/draft';
import { EMPTY_INTAKE_DRAFT, getIntakeDraftStorage, type IntakeDraft } from '@/lib/purchases/intake-draft';
import { PurchaseClientProvider, type PurchaseClient } from './PurchaseClient';
import PurchaseForm from './PurchaseForm';
import DeliveryForm from './DeliveryForm';
import PurchaseList from './PurchaseList';
import PurchaseDetailView from './PurchaseDetailView';

export default function DevPreviewWorkspace() {
  const router = useRouter();
  const params = useSearchParams();
  const [request] = useState(() => createPreviewTransport());
  const [draft, setDraft] = useState<IntakeDraft>(EMPTY_INTAKE_DRAFT);
  const [draftReady, setDraftReady] = useState(false);
  useEffect(() => {
    setDraft(readPreviewEntryDraft(getIntakeDraftStorage()));
    setDraftReady(true);
  }, []);
  const client = useMemo<PurchaseClient>(() => ({ request, navigate: path => router.push(previewHref(path)), href: previewHref, preview: true,
    previewDraft: { value: draft, ready: draftReady, update: setDraft },
  }), [request, router, draft, draftReady]);
  const view = params.get('view') ?? 'purchase';
  const id = params.get('id') ?? '';
  return <PurchaseClientProvider client={client}><SiteShell>
    <div className="page-content">
      <div className="notice mb-6" role="status">
        <strong>Local UI preview</strong>
        <p>No sign in needed. Your product selections carry over from the public form. Preview edits stay in browser memory and reset when you refresh; your public draft is left unchanged.</p>
        <p>No real requests, payments, identity checks or carrier updates are made.</p>
        <p>Delivery details and preset requests are fictional. Use sample delivery details only.</p>
      </div>
      <nav className="action-row mb-8" aria-label="Local preview">
        <Link className="text-button" href={previewHref('/purchase')}>New request</Link>
        <Link className="text-button" href={previewHref('/settings/delivery')}>Delivery details</Link>
        <Link className="text-button" href={previewHref('/orders')}>Requests</Link>
        <PreviewModeLink mode="exit" className="text-button" />
      </nav>
      {view === 'delivery' ? <><div className="page-heading"><h1>Preview delivery details</h1></div><DeliveryForm /></>
        : view === 'orders' ? <><div className="page-heading"><h1>Preview requests</h1></div><PurchaseList /></>
        : view === 'detail' ? <PurchaseDetailView id={id} />
        : <><div className="page-heading"><h1>Preview a purchase request</h1></div>
          <div className="action-row mb-6">
            <button className="text-button" type="button" disabled={!draftReady} onClick={() => setDraft(previewBookExample())}>Use a Yes24 book example</button>
            <button className="text-button" type="button" disabled={!draftReady} onClick={() => setDraft({ ...EMPTY_INTAKE_DRAFT })}>Clear product fields</button>
          </div><PurchaseForm /></>}
    </div>
  </SiteShell></PurchaseClientProvider>;
}
