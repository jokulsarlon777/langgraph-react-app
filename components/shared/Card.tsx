"use client";

import type { PropsWithChildren } from "react";
import styles from "./Card.module.css";

interface CardProps extends PropsWithChildren {
   className?: string;
 }
 
 export default function Card({ children, className = "" }: CardProps) {
   return <div className={`${styles.card} ${className}`.trim()}>{children}</div>;
 }
