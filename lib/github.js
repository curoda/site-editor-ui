const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const API_BASE = 'https://api.github.com';

async function githubFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Get a file's content from a GitHub repo.
 * Returns { content: string (decoded), sha: string }
 */
export async function getFile(repo, path) {
  const data = await githubFetch(
    `/repos/${GITHUB_OWNER}/${repo}/contents/${path}`
  );
  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return { content, sha: data.sha };
}

/**
 * Commit (create or update) a file in a GitHub repo.
 */
export async function commitFile(repo, path, content, message) {
  // Try to get existing file SHA for updates
  let sha;
  try {
    const existing = await githubFetch(
      `/repos/${GITHUB_OWNER}/${repo}/contents/${path}`
    );
    sha = existing.sha;
  } catch {
    // File doesn't exist yet — will be created
  }

  const body = {
    message,
    content: Buffer.from(content, 'utf-8').toString('base64'),
    ...(sha ? { sha } : {}),
  };

  const result = await githubFetch(
    `/repos/${GITHUB_OWNER}/${repo}/contents/${path}`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    }
  );

  return result;
}

/**
 * List files in a directory of a GitHub repo.
 */
export async function listFiles(repo, path = '') {
  const data = await githubFetch(
    `/repos/${GITHUB_OWNER}/${repo}/contents/${path}`
  );
  if (Array.isArray(data)) {
    return data.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type,
    }));
  }
  return [];
}
