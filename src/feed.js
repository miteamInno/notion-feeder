import Parser from 'rss-parser';
import dotenv from 'dotenv';
import timeDifference from './helpers';
import { getFeedUrlsFromNotion } from './notion';

dotenv.config();

const { RUN_FREQUENCY } = process.env;

async function getNewFeedItemsFrom(feedUrl) {
  const parser = new Parser();
  let rss;
  try {
    rss = await parser.parseURL(feedUrl);
  } catch (error) {
    console.error(error);
    return [];
  }
  const currentTime = new Date().getTime() / 1000;

  // Filter out items that fall in the run frequency range
  return rss.items.filter((item) => {
    const blogPublishedTime = new Date(item.pubDate).getTime() / 1000;
    const { diffInSeconds } = timeDifference(currentTime, blogPublishedTime);
    return diffInSeconds < RUN_FREQUENCY;
  });
}

// Woori
// 간단한 중복 제거 함수 (링크 기준 + 보조로 제목 기준)
// function dedupe(items) {
//   const seen = new Set();
//   const out = [];
//   for (const it of items) {
//     // 1순위: link가 있으면 link 기준
//     // 2순위: link 없으면 제목+발행일 조합 기준
//     const key = it.link ? it.link.trim() : `${it.title}::${it.pubDate}`;
//     if (seen.has(key)) continue;
//     seen.add(key);
//     out.push(it);
//   }
//   return out;
// }
function dedupe(items) {
  const seen = new Set();

  return items.filter((it) => {
    // 1순위: link가 있으면 link 기준
    // 2순위: link 없으면 제목+발행일 조합 기준
    const key = it.link ? it.link.trim() : `${it.title}::${it.pubDate}`;

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default async function getNewFeedItems() {
  let allNewFeedItems = [];

  const feeds = await getFeedUrlsFromNotion();

  for (let i = 0; i < feeds.length; i++) {
    const { feedUrl } = feeds[i];
    const feedItems = await getNewFeedItemsFrom(feedUrl);
    allNewFeedItems = [...allNewFeedItems, ...feedItems];
  }

  // NOTE: Woori
  // remove duplicate news
  allNewFeedItems = dedupe(allNewFeedItems);

  // sort feed items by published date
  allNewFeedItems.sort((a, b) => new Date(a.pubDate) - new Date(b.pubDate));

  return allNewFeedItems;
}
