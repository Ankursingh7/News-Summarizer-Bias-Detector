import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { NewsHeadline } from '../types';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const fakeNews: NewsHeadline[] = [
    { title: "Global Summit Addresses Climate Change Urgently", source: "Associated Press", url: "#" },
    { title: "New Breakthrough in AI Could Revolutionize Medicine", source: "Reuters", url: "#" },
    { title: "Stock Markets React to New Economic Policies", source: "The Wall Street Journal", url: "#" },
    { title: "Archaeologists Uncover Lost City in the Amazon", source: "National Geographic", url: "#" },
    { title: "Space Mission Successfully Launches to Explore Jupiter's Moons", source: "BBC News", url: "#" },
  ];

  res.status(200).json(fakeNews);
};
