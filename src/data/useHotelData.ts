import { useState, useCallback } from "react";
import sampleData from "./sample-data.json";
import type { Supplier, Hotel, ReviewedHotel, Decision } from "@/types/hotel";

export function useHotelData() {
  const suppliers = sampleData.suppliers as Supplier[];
  const [pendingQueue, setPendingQueue] = useState<Hotel[]>(sampleData.pending_queue as unknown as Hotel[]);
  const [reviewed, setReviewed] = useState<ReviewedHotel[]>(sampleData.reviewed as ReviewedHotel[]);

  const decide = useCallback((hotelId: string, decision: Decision, candidateSuppliers: string[]) => {
    const hotel = pendingQueue.find(h => h.id === hotelId);
    if (!hotel) return;

    setPendingQueue(prev => prev.filter(h => h.id !== hotelId));

    const newReviewed: ReviewedHotel = {
      id: hotel.id,
      hotel_name: hotel.hotel_name,
      city: hotel.city,
      country_code: hotel.country_code,
      status: decision === "MAPPED" ? "MAPPED" : decision === "REJECTED" ? "REJECTED" : "NEW",
      decision,
      mapped_to: decision === "MAPPED" ? candidateSuppliers : [],
      reviewed_at: new Date().toISOString(),
    };
    setReviewed(prev => [newReviewed, ...prev]);
  }, [pendingQueue]);

  const undo = useCallback((hotelId: string) => {
    setReviewed(prev => prev.filter(r => r.id !== hotelId));
    // In real app, would re-fetch from API. For demo, hotel is lost from pending.
  }, []);

  return { suppliers, pendingQueue, reviewed, decide, undo };
}
