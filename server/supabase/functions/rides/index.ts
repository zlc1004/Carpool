import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsHeaders } from '../shared/cors.ts';
import { NotificationHelpers } from '../shared/notification-helpers.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface CreateRideRequest {
  driverId: string;
  origin: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
  destination: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
  departureTime: string;
  availableSeats: number;
  notes?: string;
  price?: number;
  recurring?: boolean;
}

interface JoinRideRequest {
  rideId: string;
  riderId: string;
  message?: string;
}

interface UpdateRideStatusRequest {
  rideId: string;
  status: 'active' | 'completed' | 'cancelled';
  riderId?: string;
  action?: 'approve' | 'reject';
}

export default async function(req: Request) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { method, url } = req;
    const urlPath = new URL(url).pathname;

    // Route: POST /rides/create - Create a new ride
    if (method === 'POST' && urlPath.endsWith('/create')) {
      const body: CreateRideRequest = await req.json();

      // Validate required fields
      if (!body.origin?.id || !body.destination?.id || !body.driverId) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: origin, destination, and driverId are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create the ride
      const { data: ride, error: rideError } = await supabase
        .from('rides')
        .insert({
          driver_id: body.driverId,
          origin_place_id: body.origin.id,
          destination_place_id: body.destination.id,
          departure_time: body.departureTime,
          available_seats: body.availableSeats,
          notes: body.notes,
          price: body.price,
          recurring: body.recurring || false,
          status: 'active'
        })
        .select()
        .single();

      if (rideError) {
        console.error('Error creating ride:', rideError);
        return new Response(
          JSON.stringify({ error: 'Failed to create ride' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ ride }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: POST /rides/join - Join a ride (create ride request)
    if (method === 'POST' && urlPath.endsWith('/join')) {
      const body: JoinRideRequest = await req.json();

      // Check if ride exists and has available seats
      const { data: ride, error: rideError } = await supabase
        .from('rides')
        .select(`
          *,
          driver:profiles!rides_driver_id_fkey(first_name, last_name),
          origin:places!rides_origin_place_id_fkey(name),
          destination:places!rides_destination_place_id_fkey(name)
        `)
        .eq('id', body.rideId)
        .single();

      if (rideError || !ride) {
        return new Response(
          JSON.stringify({ error: 'Ride not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (ride.available_seats <= 0) {
        return new Response(
          JSON.stringify({ error: 'No available seats' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create ride request
      const { data: request, error: requestError } = await supabase
        .from('ride_requests')
        .insert({
          ride_id: body.rideId,
          rider_id: body.riderId,
          status: 'pending',
          message: body.message
        })
        .select(`
          *,
          rider:profiles!ride_requests_rider_id_fkey(first_name, last_name)
        `)
        .single();

      if (requestError) {
        console.error('Error creating ride request:', requestError);
        return new Response(
          JSON.stringify({ error: 'Failed to create ride request' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send notification to driver
      const riderName = `${request.rider.first_name} ${request.rider.last_name}`;
      await NotificationHelpers.notifyRideRequest({
        rideId: body.rideId,
        driverId: ride.driver_id,
        riderId: body.riderId,
        riderName: riderName,
        origin: ride.origin.name,
        destination: ride.destination.name,
        departureTime: ride.departure_time
      });

      return new Response(
        JSON.stringify({ request }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: POST /rides/respond - Respond to ride request (approve/reject)
    if (method === 'POST' && urlPath.endsWith('/respond')) {
      const body: UpdateRideStatusRequest = await req.json();

      if (!body.riderId || !body.action) {
        return new Response(
          JSON.stringify({ error: 'riderId and action are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get ride request details
      const { data: request, error: requestError } = await supabase
        .from('ride_requests')
        .select(`
          *,
          ride:rides!ride_requests_ride_id_fkey(
            *,
            driver:profiles!rides_driver_id_fkey(first_name, last_name),
            origin:places!rides_origin_place_id_fkey(name),
            destination:places!rides_destination_place_id_fkey(name)
          ),
          rider:profiles!ride_requests_rider_id_fkey(first_name, last_name)
        `)
        .eq('ride_id', body.rideId)
        .eq('rider_id', body.riderId)
        .single();

      if (requestError || !request) {
        return new Response(
          JSON.stringify({ error: 'Ride request not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (body.action === 'approve') {
        // Update ride request status
        const { error: updateError } = await supabase
          .from('ride_requests')
          .update({ status: 'approved' })
          .eq('id', request.id);

        if (updateError) {
          console.error('Error approving ride request:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to approve ride request' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Decrease available seats
        const { error: seatsError } = await supabase
          .from('rides')
          .update({ available_seats: request.ride.available_seats - 1 })
          .eq('id', body.rideId);

        if (seatsError) {
          console.error('Error updating available seats:', seatsError);
        }

        // Send confirmation notification to rider
        const driverName = `${request.ride.driver.first_name} ${request.ride.driver.last_name}`;
        await NotificationHelpers.notifyRideConfirmed({
          rideId: body.rideId,
          riderId: body.riderId,
          driverId: request.ride.driver_id,
          driverName: driverName,
          origin: request.ride.origin.name,
          destination: request.ride.destination.name
        });

      } else if (body.action === 'reject') {
        // Update ride request status
        const { error: updateError } = await supabase
          .from('ride_requests')
          .update({ status: 'rejected' })
          .eq('id', request.id);

        if (updateError) {
          console.error('Error rejecting ride request:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to reject ride request' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Optionally send rejection notification to rider
        // await NotificationHelpers.notifyRideRejected(...);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: POST /rides/cancel - Cancel a ride
    if (method === 'POST' && urlPath.endsWith('/cancel')) {
      const body: UpdateRideStatusRequest = await req.json();

      // Get ride details with all approved riders
      const { data: ride, error: rideError } = await supabase
        .from('rides')
        .select(`
          *,
          origin:places!rides_origin_place_id_fkey(name),
          destination:places!rides_destination_place_id_fkey(name),
          ride_requests!inner(
            rider_id,
            status
          )
        `)
        .eq('id', body.rideId)
        .single();

      if (rideError || !ride) {
        return new Response(
          JSON.stringify({ error: 'Ride not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update ride status
      const { error: updateError } = await supabase
        .from('rides')
        .update({ status: 'cancelled' })
        .eq('id', body.rideId);

      if (updateError) {
        console.error('Error cancelling ride:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to cancel ride' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get approved riders
      const approvedRiders = ride.ride_requests
        .filter(req => req.status === 'approved')
        .map(req => req.rider_id);

      // Send cancellation notifications
      if (approvedRiders.length > 0) {
        await NotificationHelpers.notifyRideCancelled({
          rideId: body.rideId,
          riderIds: approvedRiders,
          origin: ride.origin.name,
          destination: ride.destination.name
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: GET /rides/search - Search for available rides
    if (method === 'GET' && urlPath.endsWith('/search')) {
      const searchParams = new URLSearchParams(url.split('?')[1] || '');
      const originLat = parseFloat(searchParams.get('originLat') || '0');
      const originLng = parseFloat(searchParams.get('originLng') || '0');
      const destLat = parseFloat(searchParams.get('destLat') || '0');
      const destLng = parseFloat(searchParams.get('destLng') || '0');
      const radius = parseFloat(searchParams.get('radius') || '10'); // km
      const departureDate = searchParams.get('departureDate');

      // Build query for nearby rides
      let query = supabase
        .from('rides')
        .select(`
          *,
          driver:profiles!rides_driver_id_fkey(id, first_name, last_name, avatar_url),
          origin:places!rides_origin_place_id_fkey(*),
          destination:places!rides_destination_place_id_fkey(*)
        `)
        .eq('status', 'active')
        .gt('available_seats', 0);

      if (departureDate) {
        const startDate = new Date(departureDate);
        const endDate = new Date(startDate);
        endDate.setHours(23, 59, 59);

        query = query
          .gte('departure_time', startDate.toISOString())
          .lte('departure_time', endDate.toISOString());
      }

      const { data: rides, error } = await query;

      if (error) {
        console.error('Error searching rides:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to search rides' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Filter by distance (basic implementation - could be improved with PostGIS)
      const filteredRides = rides?.filter(ride => {
        const originDistance = this.calculateDistance(
          originLat, originLng,
          ride.origin.latitude, ride.origin.longitude
        );
        const destDistance = this.calculateDistance(
          destLat, destLng,
          ride.destination.latitude, ride.destination.longitude
        );

        return originDistance <= radius && destDistance <= radius;
      }) || [];

      return new Response(
        JSON.stringify({ rides: filteredRides }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default 404 response
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Rides function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
