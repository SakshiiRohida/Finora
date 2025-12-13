import React, { useEffect, useState } from "react";

function LearnList() {
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/learn")
      .then((res) => res.json())
      .then((data) => setTopics(data))
      .catch((err) => console.error("Error fetching topics:", err));
  }, []);

  return (
    <div>
      {topics.length > 0 ? (
        <ul>
          {topics.map((topic) => (
            <li key={topic.id} style={{ marginBottom: "20px" }}>
              <h3>{topic.title}</h3>
              <p><strong>Level:</strong> {topic.level}</p>
              <p><strong>Category:</strong> {topic.category}</p>
              <p><strong>Duration:</strong> {topic.duration}</p>
              <p>{topic.description}</p>
              <ul>
                {topic.lessons.map((lesson, index) => (
                  <li key={index}>{lesson}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <p>Loading topics...</p>
      )}
    </div>
  );
}

export default LearnList;
