import type { Handler } from "@netlify/functions";

const handler: Handler = async () => {
  // Temporary static response for testing
  const fakeNews = [
    { title: "Government introduces new economic policy", source: "BBC", bias: "Neutral" },
    { title: "Opposition criticizes ruling party decisions", source: "CNN", bias: "Slightly Negative" },
    { title: "Stock markets reach record highs", source: "Reuters", bias: "Positive" },
  ];

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      articles: fakeNews,
    }),
  };
};

export { handler };
