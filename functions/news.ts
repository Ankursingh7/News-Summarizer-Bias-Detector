import type { Handler } from "@netlify/functions";
import type { NewsHeadline } from '../types';

const handler: Handler = async () => {
  const fakeNews: NewsHeadline[] = [
    { title: "Global Summit Addresses Climate Change Urgently", source: "Associated Press", url: "#" },
    { title: "New Breakthrough in AI Could Revolutionize Medicine", source: "Reuters", url: "#" },
    { title: "Stock Markets React to New Economic Policies", source: "The Wall Street Journal", url: "#" },
    { title: "Archaeologists Uncover Lost City in the Amazon", source: "National Geographic", url: "#" },
    { title: "Space Mission Successfully Launches to Explore Jupiter's Moons", source: "BBC News", url: "#" },
  ];

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fakeNews),
  };
};

export { handler };
