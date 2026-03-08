
-- Study Groups
CREATE TABLE public.study_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject_focus text NOT NULL,
  max_members integer NOT NULL DEFAULT 10,
  join_code text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Forum
CREATE TABLE public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  topic text,
  question text NOT NULL,
  image_url text,
  best_answer_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.forum_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  answer text NOT NULL,
  is_best boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.forum_answers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.forum_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id uuid NOT NULL REFERENCES public.forum_answers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  vote_type text NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(answer_id, user_id)
);
ALTER TABLE public.forum_votes ENABLE ROW LEVEL SECURITY;

-- Study Buddy
CREATE TABLE public.buddy_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  subjects text[] NOT NULL DEFAULT '{}',
  study_hours_per_day numeric NOT NULL DEFAULT 4,
  preferred_time text NOT NULL DEFAULT 'evening',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.buddy_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.buddy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);
ALTER TABLE public.buddy_requests ENABLE ROW LEVEL SECURITY;

-- Batch Feed
CREATE TABLE public.batch_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  year text NOT NULL,
  branch text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.batch_profiles ENABLE ROW LEVEL SECURITY;

-- Enable realtime for group messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;

-- RLS Policies

-- Study Groups: anyone authenticated can create, members can view
CREATE POLICY "Users can create groups" ON public.study_groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Anyone can view groups" ON public.study_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Creator can update group" ON public.study_groups FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Creator can delete group" ON public.study_groups FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Group Members
CREATE POLICY "Members can view group members" ON public.group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join groups" ON public.group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON public.group_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Group Messages
CREATE POLICY "Members can view messages" ON public.group_messages FOR SELECT TO authenticated USING (
  group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
);
CREATE POLICY "Members can send messages" ON public.group_messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
);

-- Forum Posts: public read, authenticated write
CREATE POLICY "Anyone can view posts" ON public.forum_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create posts" ON public.forum_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.forum_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.forum_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Forum Answers
CREATE POLICY "Anyone can view answers" ON public.forum_answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create answers" ON public.forum_answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own answers" ON public.forum_answers FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Forum Votes
CREATE POLICY "Anyone can view votes" ON public.forum_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can vote" ON public.forum_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can change vote" ON public.forum_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can remove vote" ON public.forum_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Buddy Profiles
CREATE POLICY "Anyone can view buddy profiles" ON public.buddy_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create own buddy profile" ON public.buddy_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own buddy profile" ON public.buddy_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Buddy Requests
CREATE POLICY "Users can view own requests" ON public.buddy_requests FOR SELECT TO authenticated USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "Users can send requests" ON public.buddy_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Users can update received requests" ON public.buddy_requests FOR UPDATE TO authenticated USING (auth.uid() = to_user_id);

-- Batch Profiles
CREATE POLICY "Anyone can view batch profiles" ON public.batch_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create own batch profile" ON public.batch_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own batch profile" ON public.batch_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
