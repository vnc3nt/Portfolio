import { NextResponse } from 'next/server';
import { Octokit } from 'octokit';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  // 0. Verify Auth
  const authHeader = request.headers.get('authorization');
  const userToken = authHeader?.split(' ')[1];

  if (!userToken) {
    return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const owner = searchParams.get('owner');
  const repo = searchParams.get('repo');

  if (!owner || !repo) {
    return NextResponse.json({ error: 'Owner and Repo are required' }, { status: 400 });
  }

  const octokit = new Octokit({
    auth: process.env.GITHUB_ACCESS_TOKEN,
  });

  try {
    const [repoData, contributors] = await Promise.all([
      octokit.rest.repos.get({ owner, repo }),
      octokit.rest.repos.listContributors({ owner, repo, per_page: 5 })
    ]);

    const result = {
      ...repoData.data,
      contributors: contributors.data.map((c) => ({
        login: c.login,
        avatar_url: c.avatar_url,
        html_url: c.html_url,
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching repo details:', error);
    return NextResponse.json({ error: 'Failed to fetch repo details' }, { status: 500 });
  }
}
