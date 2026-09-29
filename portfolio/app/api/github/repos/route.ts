import { NextResponse } from 'next/server';
import { Octokit } from 'octokit';
import { isAdminRequest } from '../../../../utils/apiAuth';

export async function GET(request: Request) {
  if (!await isAdminRequest(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const ghToken = process.env.GITHUB_ACCESS_TOKEN;
  
  if (!ghToken) {
    return NextResponse.json({ error: 'Server configuration error: Missing GITHUB_ACCESS_TOKEN' }, { status: 500 });
  }

  const octokit = new Octokit({
    auth: ghToken,
  });

  try {
    // 1. Check who is the owner of the token
    let tokenOwner = '';
    try {
      const { data: user } = await octokit.rest.users.getAuthenticated();
      tokenOwner = user.login;
    } catch {
      // Fallback if token is invalid or just public access needed (unlikely if token provided)
      console.warn('Could not verify token owner');
    }

    let data;

    // 2. If the requested username matches the token owner, use listForAuthenticatedUser to get private repos too
    if (tokenOwner && username.toLowerCase() === tokenOwner.toLowerCase()) {
      const response = await octokit.rest.repos.listForAuthenticatedUser({
        visibility: 'all',
        sort: 'updated',
        per_page: 100,
        affiliation: 'owner,collaborator,organization_member'
      });
      data = response.data;
    } else {
      // 3. Otherwise fetch public repos or whatever the token has access to via listForUser
      const response = await octokit.rest.repos.listForUser({
        username,
        sort: 'updated',
        per_page: 100,
        type: 'all'
      });
      data = response.data;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching repos:', error);
    return NextResponse.json({ error: 'Failed to fetch repos' }, { status: 500 });
  }
}
