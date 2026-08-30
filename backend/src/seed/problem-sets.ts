import type { Core } from '@strapi/strapi';

type ProblemSeed = {
  category: string;
  title: string;
  problemUrl: string;
  difficulty: 'easy' | 'medium' | 'hard';
  order: number;
};

const PROBLEMS: ProblemSeed[] = [
  {
    category: 'Array',
    title: 'Reverse the array',
    problemUrl: 'https://www.geeksforgeeks.org/write-a-program-to-reverse-an-array-or-string/',
    difficulty: 'easy',
    order: 1,
  },
  {
    category: 'Array',
    title: 'Kth max and min element in an array',
    problemUrl: 'https://practice.geeksforgeeks.org/problems/kth-smallest-element/0',
    difficulty: 'medium',
    order: 2,
  },
  {
    category: 'Array',
    title: 'Trapping Rain Water',
    problemUrl: 'https://practice.geeksforgeeks.org/problems/trapping-rain-water/0',
    difficulty: 'hard',
    order: 3,
  },
  {
    category: 'Matrix',
    title: 'Spiral traversal on a matrix',
    problemUrl: 'https://practice.geeksforgeeks.org/problems/spirally-traversing-a-matrix/0',
    difficulty: 'easy',
    order: 1,
  },
  {
    category: 'Matrix',
    title: 'Search an element in a matrix',
    problemUrl: 'https://leetcode.com/problems/search-a-2d-matrix/',
    difficulty: 'medium',
    order: 2,
  },
  {
    category: 'String',
    title: 'Reverse a string',
    problemUrl: 'https://leetcode.com/problems/reverse-string/',
    difficulty: 'easy',
    order: 1,
  },
  {
    category: 'String',
    title: 'Longest palindromic substring',
    problemUrl: 'https://practice.geeksforgeeks.org/problems/longest-palindrome-in-a-string/0',
    difficulty: 'medium',
    order: 2,
  },
  {
    category: 'Searching & Sorting',
    title: 'Search in a rotated sorted array',
    problemUrl: 'https://leetcode.com/problems/search-in-rotated-sorted-array/',
    difficulty: 'medium',
    order: 1,
  },
  {
    category: 'Searching & Sorting',
    title: 'Find four elements that sum to a given value',
    problemUrl: 'https://practice.geeksforgeeks.org/problems/find-all-four-sum-numbers/0',
    difficulty: 'hard',
    order: 2,
  },
  {
    category: 'Binary Trees',
    title: 'Level order traversal',
    problemUrl: 'https://practice.geeksforgeeks.org/problems/level-order-traversal/1',
    difficulty: 'easy',
    order: 1,
  },
  {
    category: 'Binary Trees',
    title: 'Diameter of a tree',
    problemUrl: 'https://practice.geeksforgeeks.org/problems/diameter-of-binary-tree/1',
    difficulty: 'medium',
    order: 2,
  },
  {
    category: 'Greedy',
    title: 'Activity Selection Problem',
    problemUrl: 'https://practice.geeksforgeeks.org/problems/activity-selection-1587115620/1',
    difficulty: 'easy',
    order: 1,
  },
  {
    category: 'Greedy',
    title: 'Minimum Platforms Problem',
    problemUrl: 'https://practice.geeksforgeeks.org/problems/minimum-platforms-1587115620/1',
    difficulty: 'medium',
    order: 2,
  },
  {
    category: 'Backtracking',
    title: 'N-Queen Problem',
    problemUrl: 'https://practice.geeksforgeeks.org/problems/n-queen-problem0315/1',
    difficulty: 'hard',
    order: 1,
  },
  {
    category: 'Heap',
    title: 'Kth largest element in an array',
    problemUrl: 'https://practice.geeksforgeeks.org/problems/k-largest-elements4206/1',
    difficulty: 'medium',
    order: 1,
  },
  {
    category: 'Graph',
    title: 'Implement BFS algorithm',
    problemUrl: 'https://practice.geeksforgeeks.org/problems/bfs-traversal-of-graph/1',
    difficulty: 'easy',
    order: 1,
  },
  {
    category: 'Graph',
    title: 'Dijkstra algorithm',
    problemUrl: 'https://practice.geeksforgeeks.org/problems/implementing-dijkstra-set-1-adjacency-matrix/1',
    difficulty: 'medium',
    order: 2,
  },
  {
    category: 'Trie',
    title: 'Construct a trie from scratch',
    problemUrl: 'https://www.geeksforgeeks.org/trie-insert-and-search/',
    difficulty: 'medium',
    order: 1,
  },
  {
    category: 'Dynamic Programming',
    title: 'Coin Change Problem',
    problemUrl: 'https://practice.geeksforgeeks.org/problems/coin-change2448/1',
    difficulty: 'medium',
    order: 1,
  },
  {
    category: 'Dynamic Programming',
    title: 'Longest Common Subsequence',
    problemUrl: 'https://practice.geeksforgeeks.org/problems/longest-common-subsequence/0',
    difficulty: 'medium',
    order: 2,
  },
  {
    category: 'Bit Manipulation',
    title: 'Count set bits in an integer',
    problemUrl: 'https://practice.geeksforgeeks.org/problems/set-bits0143/1',
    difficulty: 'easy',
    order: 1,
  },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function seedProblemSets(strapi: Core.Strapi): Promise<void> {
  for (const seed of PROBLEMS) {
    const slug = slugify(`${seed.category}-${seed.title}`);
    const existing = await strapi.documents('api::problem-set.problem-set').findMany({
      filters: { slug: { $eq: slug } },
      limit: 1,
    });
    if (existing.length > 0) continue;

    await strapi.documents('api::problem-set.problem-set').create({
      data: {
        ...seed,
        slug,
        description: `Practice this ${seed.category} problem from the 450 DSA sheet, then return here to track your attempt and completion.`,
      },
    });
  }
}
