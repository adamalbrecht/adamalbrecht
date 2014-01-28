module Jekyll
  module TitleizeFilter
    SMALL_WORDS = %w{a an and as at but by en for if in of on or the to v v. via vs vs.}
    def titleize(str)
      str = str.to_s
      words = str.split(/[_\- ]/)
      words.each do |word|
        unless SMALL_WORDS.include?(word)
          word.capitalize!
        end
      end
      words.join(' ')
    end
  end
end

Liquid::Template.register_filter(Jekyll::TitleizeFilter)
