import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";
import DecisionRoomClient from "./DecisionRoomClient";

export default async function DecisionRoomPage() {
  const supabase = await createServerClient();
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/login');
  }
  
  // Get user role
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (userError || !userData) {
    redirect('/login');
  }
  
  // Verify user is a brand
  if (userData.role !== 'brand') {
    redirect('/dashboard');
  }
  
  // Get or create active decision room for this user
  const { data: existingRooms } = await supabase
    .from('decision_rooms')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
  
  let roomId: string;
  
  if (existingRooms && existingRooms.length > 0) {
    roomId = existingRooms[0].id;
  } else {
    // Create new decision room
    const { data: newRoom, error: createError } = await supabase
      .from('decision_rooms')
      .insert({
        user_id: user.id,
        stage_progress: {
          idea: false,
          directions: false,
          evidence: false,
          review: false,
          passport: false
        }
      })
      .select('id')
      .single();
    
    if (createError || !newRoom) {
      throw new Error('Failed to create decision room');
    }
    
    roomId = newRoom.id;
  }
  
  return <DecisionRoomClient roomId={roomId} />;
}
