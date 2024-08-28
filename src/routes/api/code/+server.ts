import { json } from '@sveltejs/kit';
import { code } from '$lib/code.ts';

export function GET() {
    return json(code);
}
