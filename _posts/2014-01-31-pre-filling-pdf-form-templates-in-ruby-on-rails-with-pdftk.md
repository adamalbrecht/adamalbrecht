---

layout: post
tags: coding, ruby, rails, pdf
title: Pre-Filling PDF Form Templates in Ruby-on-Rails with PDFtk

---

In [a recent post](/2014/01/14/generate-clean-testable-pdf-reports-in-rails-with-prawn), I talked about how to generate PDF reports in Rails using Prawn. This approach is great for generating PDF's with lots of data tables and other variable-length content. But an alternative situation is when you already have a template authored in an application such as Adobe Acrobat and you want to populate it with data from your database. This makes it more difficult to insert variable-length content, but on the plus side, you no longer need to worry about the layout of the document.

<!-- more -->

While there are a number of libraries out there that can perform PDF manipulation, the one I have found to work best is [PDFtk](http://www.pdflabs.com/tools/pdftk-the-pdf-toolkit/). There is a GUI version, but you'll want the [command line version](http://www.pdflabs.com/tools/pdftk-server/), which is available in most package managers. [^pdftk_license] This library is free for personal use, but requires a license if used in production.

PDFtk is a non-ruby command line tool and while it works great on its own in that context, it will be much easier if we use a ruby wrapper, so go ahead and add the [pdf-forms](https://github.com/jkraemer/pdf-forms) gem to your project.

For this example, I've provided a really simple PDF form that I created in Adobe Acrobat [^adobe_acrobat_alternatives]. You can [download it here](/public/test_form.pdf) and add it to your project (I put mine in `lib/pdf_templates`). There are plenty of other resources out there on creating PDF forms, so I won't go over that, but make sure you take note of the names of the fields. If you are starting with a template created by someone else, you'll still want to open it up in Adobe Acrobat (or a similar app) to reference the names of the form fields. [^acrobat_permission_error]. The pdf-forms gem has a command for viewing the names, but I found that it didn't always work.

![Create your PDF form using Adobe Acrobat](/public/img/adobe_acrobat_pdf_form.png)

Next, let's get to the coding. Just as in my post on generating pdfs with Prawn, I like to represent each pdf document as a ruby class. But first let's create a base class that takes care of the common functionality. So create a file called fillable_pdf_form.rb. In my rails app, I placed it in `app/pdfs`. [^restart_note]. Here's how my base class turned out:

{% highlight ruby %}
class FillablePdfForm

  attr_writer :template_path
  attr_reader :attributes

  def initialize
    fill_out
  end

  def export(output_file_path=nil)
    output_path = output_file_path || "#{Rails.root}/tmp/pdfs/#{SecureRandom.uuid}.pdf" # make sure tmp/pdfs exists
    pdftk.fill_form template_path, output_path, attributes
    output_path
  end

  def get_field_names 
    pdftk.get_field_names template_path
  end

  def template_path
    @template_path ||= "#{Rails.root}/lib/pdf_templates/#{self.class.name.gsub('Pdf', '').underscore}.pdf" # makes assumption about template file path unless otherwise specified
  end

  protected

  def attributes
    @attributes ||= {}
  end

  def fill(key, value)
    attributes[key.to_s] = value
  end

  def pdftk
    @pdftk ||= PdfForms.new(ENV['PDFTK_PATH'] || '/usr/local/bin/pdftk') # On my Mac, the location of pdftk was different than on my linux server.
  end

  def fill_out
    raise 'Must be overridden by child class'
  end

end
{% endhighlight %}

And now I can keep my actual test pdf form class short and sweet. The `fill_out` method is all that's required.

{% highlight ruby %}
class TestPdfForm < FillablePdfForm

  def initialize(user)
    @user = user
    super()
  end

  protected

  def fill_out
    fill :date, Date.today.to_s
    [:first_name, :last_name, :address, :address_2, :city, :state, :zip_code].each do |field|
      fill field, @user.send(field)
    end
    fill :age, case @user.age
      when nil then nil
      when 0..17 then '0_17'
      when 18..34 then '18_34'
      when 35..54 then '35_54'
      else '55_plus'
    end
    fill :comments, "Hello, World"
  end
end

{% endhighlight %}

And my controller might look something like this:

{% highlight ruby %}
class UsersController < ApplicationController
  def show
    user = User.find(params[:id])
    respond_to do |format|
      format.pdf { send_file TestPdfForm.new(user).export, type: 'application/pdf' }
    end
  end
end
{% endhighlight %}

And that's all you need! The generated form will be both readable and writable in Adobe Reader and Mac Preview. So if you need the user to fill out a few additional fields, they can do so. But if you don't want this, simply mark the fields in your template as read-only. So if your template isn't a "form" but you just want to merge some data into a document, this is still a great way to do it.

From there, creating additional forms is extremely easy. The only difficulty I ever encounter is in figuring out the proper field names for templates I didn't create, but this is still fairly trivial.

If you have any questions, send them to me on [Twitter](http://twitter.com/adam_albrecht).

[^pdftk_license]: While PDFtk is free for personal use, it does require a license in production.
[^adobe_acrobat_alternatives]: There are many lower-cost and free alternatives to Adobe Acrobat, but I don't have any experience with them, so I won't make any recommendations.
[^restart_note]: You may need to restart your dev server to make sure it picks up changes in this new folder.
[^acrobat_permission_error]: If Acrobat shows you an error message that something like "This form cannot be edited in Acrobat. Please use Adobe LiveCycle Designer to edit this form", then you'll either need to either get a version of the PDF that doesn't have these permissions turned on or you'll need to export it the document as a new pdf, and then re-import it into Acrobat and lay out the form fields yourself.
