import os
from supabase import create_client

def check_valdigne():
    url = os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)
    
    res = supabase.from_("teams").select("*").ilike("name", "%Valdigne%").execute()
    print(res.data)

if __name__ == "__main__":
    check_valdigne()
