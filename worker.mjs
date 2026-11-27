import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers';
import openNext, {
  BucketCachePurge,
  DOQueueHandler as OpenNextQueueHandler,
  DOShardedTagCache,
} from './.open-next/worker.js';
import { fetchWithImageFallback, handleWorkerRequest } from './worker-preview-policy.mjs';
import { serveKujiVideo } from './worker-video-range.mjs';

export { BucketCachePurge, DOShardedTagCache };

const rendererCount = 4;

export class DOQueueHandler extends OpenNextQueueHandler {
  constructor(ctx, env) {
    // Use a loopback binding so queue requests can carry Next's revalidation token.
    super(ctx, { ...env, WORKER_SELF_REFERENCE: ctx.exports.PopBoxRevalidation });
  }
}

export class PopBoxNextRenderer extends DurableObject {
  fetch(request) {
    return fetchWithImageFallback(openNext, request, this.env, this.ctx);
  }
}

const storefront = {
  fetch(request, env) {
    const video = serveKujiVideo(request, env.ASSETS);
    if (video) {
      return video;
    }
    // Render requests are stateless. Keep the shard count bounded without
    // deriving object names from customer, session, or request data.
    const renderer = env.POPBOX_NEXT_RENDERER.getByName(String(Math.floor(Math.random() * rendererCount)));
    return renderer.fetch(request);
  },
};

export class PopBoxRevalidation extends WorkerEntrypoint {
  fetch(request) {
    if (request.method !== 'HEAD' || !request.headers.get('x-prerender-revalidate')) {
      return new Response(null, { status: 404 });
    }

    // The queue calls this entrypoint through a service binding. Next validates the token.
    return storefront.fetch(request, this.env);
  }
}

const worker = {
  fetch(request, env, ctx) {
    return handleWorkerRequest(storefront, request, env, ctx);
  },
};

export default worker;
