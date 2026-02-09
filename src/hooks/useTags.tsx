import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TagWithStats {
  name: string;
  count: number;
  contactIds: string[];
}

export const useTags = () => {
  const { data: tagsData, isLoading } = useQuery({
    queryKey: ["contact-tags"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { data, error } = await supabase
        .from("contacts")
        .select("id, tags")
        .eq("company_id", profile.company_id);

      if (error) throw error;

      // Build tag statistics
      const tagMap = new Map<string, { count: number; contactIds: string[] }>();
      
      data.forEach((contact) => {
        if (contact.tags && Array.isArray(contact.tags)) {
          contact.tags.forEach((tag: string) => {
            if (!tagMap.has(tag)) {
              tagMap.set(tag, { count: 0, contactIds: [] });
            }
            const stats = tagMap.get(tag)!;
            stats.count++;
            stats.contactIds.push(contact.id);
          });
        }
      });

      const tags: TagWithStats[] = Array.from(tagMap.entries())
        .map(([name, stats]) => ({
          name,
          count: stats.count,
          contactIds: stats.contactIds,
        }))
        .sort((a, b) => b.count - a.count);

      const totalContactsWithTags = new Set(
        data.filter(c => c.tags?.length).map(c => c.id)
      ).size;

      return {
        tags,
        totalTags: tags.length,
        totalContactsWithTags,
        mostUsedTag: tags[0] || null,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });

  return {
    tags: tagsData?.tags || [],
    totalTags: tagsData?.totalTags || 0,
    totalContactsWithTags: tagsData?.totalContactsWithTags || 0,
    mostUsedTag: tagsData?.mostUsedTag || null,
    isLoading,
  };
};
