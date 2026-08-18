import { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/daily/:limit?',
    categories: ['traditional-media'],
    example: '/neweekly/daily/30',
    parameters: { limit: '获取文章数量，默认 20' },
    name: '每日最新（增强版）',
    maintainers: ['Catch1T'],
    handler,
};

async function handler(ctx) {
    const limit = ctx.req.param('limit') ? parseInt(ctx.req.param('limit')) : 20;
    const apiUrl = 'https://neweekly.com.cn/web/v1/daily/article/list';

    let allArticles: any[] = [];
    let nextTime: number | null = Date.now();

    // 循环分页获取
    while (allArticles.length < limit && nextTime) {
        const response = await got.post(apiUrl, {
            form: { time: nextTime },
            headers: {
                Referer: 'https://neweekly.com.cn/daily',
                Origin: 'https://neweekly.com.cn',
            },
        });

        const articles = response.data?.data?.articles || [];
        nextTime = response.data?.data?.nextTime || null;

        allArticles = [...allArticles, ...articles];

        // 安全退出：无更多数据
        if (!articles.length || !nextTime) break;

        // 防止触发反爬，每次翻页间隔 1 秒
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const items = allArticles.slice(0, limit).map((art) => ({
        title: art.title,
        link: `https://neweekly.com.cn/article/${art.articleUid}`,
        author: art.authorName?.replace(/文\s*\|\s*/g, '').trim(),
        category: art.moTitle,
        pubDate: parseDate(art.factTime),
        description: `<img src="${art.coverImg}" referrerpolicy="no-referrer"/><br/>${art.title}`,
        guid: art.articleUid,
    }));

    return {
        title: '新周刊 - 每日最新',
        link: 'https://neweekly.com.cn/daily',
        item: items,
        language: 'zh-cn',
    };
}
