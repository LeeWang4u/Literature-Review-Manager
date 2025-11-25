import React from "react";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  to_read: number;
  reading: number;
  completed: number;
}

const PieChart: React.FC<Props> = ({ to_read, reading, completed }) => {
  const data = {
    labels: ["To Read", "Reading", "Completed"],
    datasets: [
      {
        data: [to_read, reading, completed],
        backgroundColor: [
            "rgb(224, 224, 224)",
            "rgb(25, 118, 210)",
            "rgb(46, 125, 50)",
        //   "rgba(255, 99, 132, 0.6)",
        //   "rgba(54, 162, 235, 0.6)",
        //   "rgba(75, 192, 192, 0.6)"
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div style={{ width: "360px", margin: "0 auto" }}>
      <Pie data={data} />
    </div>
  );
};

export default PieChart;
