import { Octokit } from 'octokit';

// Nutzt den Token aus .env.local oder fällt auf unauthentifizierte Anfragen zurück
const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN,
});

export interface GitHubRepo {
  id: number;
  name: string;
  description: string;
  html_url: string;
  topics: string[];
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface GitHubContributor {
  login: string;
  avatar_url: string;
  html_url: string;
}

export async function getUserRepos(username: string) {
  try {
    const { data } = await octokit.rest.repos.listForUser({
      username,
      sort: 'updated',
      per_page: 100,
      type: 'all'
    });
    return data;
  } catch (error) {
    console.error('Error fetching repos:', error);
    return [];
  }
}

export async function getRepoDetails(owner: string, repo: string) {
  try {
    const [repoData, contributors] = await Promise.all([
      octokit.rest.repos.get({ owner, repo }),
      octokit.rest.repos.listContributors({ owner, repo, per_page: 5 })
    ]);

    return {
      ...repoData.data,
      contributors: contributors.data.map((c) => ({
        login: c.login,
        avatar_url: c.avatar_url,
        html_url: c.html_url,
      })),
    };
  } catch (error) {
    console.error('Error fetching repo details:', error);
    return null;
  }
}
