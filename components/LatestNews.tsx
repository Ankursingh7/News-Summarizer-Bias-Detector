import React, { useEffect, useState } from "react";

interface NewsItem {
  title: string;
  description: string;
  url: string;
  source: string;
}

const LatestNews: React.FC = () => {
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: "latest political news" }),
        });

        if (!res.ok) {
          throw new Error("Failed to fetch news");
        }

        const data = await res.json();

        // Expecting the Netlify function to return articles
        setArticles(data.articles || []);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) return <p className="text-center">Loading latest news...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;

  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4">📰 Latest Political News</h2>
      <ul className="space-y-4">
        {articles.map((article, index) => (
          <li key={index} className="border-b pb-2">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 font-semibold hover:underline"
            >
              {article.title}
            </a>
            <p className="text-gray-600 text-sm">{article.description}</p>
            <span className="text-gray-400 text-xs">Source: {article.source}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LatestNews;
